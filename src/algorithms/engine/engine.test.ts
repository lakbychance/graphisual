/**
 * The event engine's checks (see the harness's TESTING.md): oracle, rule and scrub checks on
 * the seeded random suite, and the golden narration file per algorithm.
 */
import { describe, it, expect } from "vitest";
import dijkstraAdapter from "../adapters/dijkstra";
import type { AlgorithmAdapter, AlgorithmInput } from "../types";
import { createAdjacencyList } from "../adapters/__tests__/testUtils";
import { applyEvent, emptyFrame, frameAt, narrate, type AlgorithmEvent, type AnswerEvent, type Frame } from ".";
import { randomGraphs } from "./__tests__/randomGraphs";
import { bruteForceDistances } from "./__tests__/oracles";
import {
  groupsOnlyIncrease, pointsAtPseudocode, relaxOnlyLowers, settlesOnceInOrder, type Rule,
} from "./__tests__/rules";

const suite = randomGraphs(200);

/** Algorithms on the event engine, with the rules their event streams must obey. */
const ported: Array<{ adapter: AlgorithmAdapter; rules: Record<string, Rule> }> = [
  {
    adapter: dijkstraAdapter,
    rules: { pointsAtPseudocode, groupsOnlyIncrease, relaxOnlyLowers, settlesOnceInOrder },
  },
];

const eventsOf = (adapter: AlgorithmAdapter, input: AlgorithmInput) => adapter.events!(input);

describe("oracle check", () => {
  it("Dijkstra's distances and route match brute-force shortest paths", () => {
    for (const { seed, input } of suite) {
      const events = eventsOf(dijkstraAdapter, input);
      const best = bruteForceDistances(input);
      const end = input.endNodeId!;
      const answer = events.find((e): e is AnswerEvent => e.type === "answer");

      for (const e of events) {
        if (e.type === "settle") expect(e.value, `seed ${seed}: distance of ${e.node}`).toBe(best.get(e.node));
      }
      if (!best.has(end)) {
        expect(answer?.path, `seed ${seed}: no route exists`).toBeNull();
        continue;
      }
      const path = answer?.path ?? [];
      expect(answer?.cost, `seed ${seed}: route cost`).toBe(best.get(end));
      expect([path[0], path[path.length - 1]], `seed ${seed}: route ends`).toEqual([input.startNodeId, end]);
      // The route is made of real edges and costs what it claims.
      let total = 0;
      for (let i = 1; i < path.length; i++) {
        const weights = (input.adjacencyList.get(path[i - 1]) ?? []).filter((e) => e.to === path[i]).map((e) => e.weight);
        expect(weights.length, `seed ${seed}: edge ${path[i - 1]}→${path[i]} exists`).toBeGreaterThan(0);
        total += Math.min(...weights);
      }
      expect(total, `seed ${seed}: route weight`).toBe(best.get(end));
    }
  });
});

describe("rule checks", () => {
  for (const { adapter, rules } of ported) {
    for (const [name, rule] of Object.entries(rules)) {
      it(`${adapter.metadata.name}: ${name}`, () => {
        for (const { seed, input } of suite) {
          const violation = rule(eventsOf(adapter, input), { pseudocode: adapter.pseudocode! });
          expect(violation, `seed ${seed}`).toBeNull();
        }
      });
    }
  }
});

describe("scrub check", () => {
  it("frameAt from cached checkpoints equals replaying from step 0, for every step", () => {
    for (const { adapter } of ported) {
      for (const { seed, input } of suite) {
        const events: AlgorithmEvent[] = eventsOf(adapter, input);
        const replayed: Frame[] = [emptyFrame];
        for (const event of events) replayed.push(applyEvent(replayed[replayed.length - 1], event));
        // Scrub backwards first, then forwards, so checkpoints are both built and reused.
        const order = replayed.map((_, i) => i);
        for (const i of [...order].reverse().concat(order)) {
          expect(frameAt(events, i), `${adapter.metadata.id} seed ${seed} step ${i}`).toStrictEqual(replayed[i]);
        }
      }
    }
  });
});

/* ------------------------------------------------------------ golden narration */

const LABELS = ["A", "B", "C", "D", "E", "F"];

/** A small graph with lettered nodes (ids are indexes into LABELS). */
function lettered(edges: Array<[number, number, number]>, size: number, start: number, end: number, directed = false) {
  const input: AlgorithmInput = {
    adjacencyList: createAdjacencyList(
      LABELS.slice(0, size).map((_, id) => id),
      edges.map(([from, to, weight]) => ({ from, to, weight, type: directed ? "directed" : "undirected" })),
    ),
    nodes: LABELS.slice(0, size).map((_, id) => ({ id })),
    startNodeId: start,
    endNodeId: end,
  };
  const edgeList = edges.map(([from, to, weight]) => `${LABELS[from]}${directed ? "→" : "–"}${LABELS[to]} ${weight}`).join(", ");
  return { input, edgeList };
}

const plain = (message: string) => message.replace(/\{n:(\d+)\}/g, (_, id) => LABELS[Number(id)]);

function transcript(adapter: AlgorithmAdapter, title: string, { input, edgeList }: ReturnType<typeof lettered>, levels: Array<"overview" | "every-edge">) {
  const events = eventsOf(adapter, input);
  const lines = [`## ${title}`, "", `From ${LABELS[input.startNodeId]} to ${LABELS[input.endNodeId!]}. Edges: ${edgeList}`];
  for (const level of levels) {
    lines.push("", level === "overview" ? "### Overview" : "### Every edge", "");
    narrate(events, level).forEach((message, i) => lines.push(`${String(i + 1).padStart(2)}. ${plain(message)}`));
  }
  return lines.join("\n");
}

/** The classic weighted graph the landing pages use. */
const STANDARD: Array<[number, number, number]> = [
  [0, 1, 4], [0, 2, 2], [2, 1, 1], [1, 3, 5], [2, 4, 9], [3, 4, 2], [3, 5, 3], [4, 5, 6],
];

describe("golden narration", () => {
  it("Dijkstra's", async () => {
    const text = [
      "# Dijkstra's",
      "",
      transcript(dijkstraAdapter, "Standard graph", lettered(STANDARD, 6, 0, 5), ["overview", "every-edge"]),
      "",
      transcript(dijkstraAdapter, "A tie", lettered([[0, 1, 2], [0, 2, 2], [1, 3, 1], [2, 3, 3]], 4, 0, 3), ["every-edge"]),
      "",
      transcript(dijkstraAdapter, "No route", lettered([[0, 1, 3], [2, 1, 1]], 3, 0, 2, true), ["every-edge"]),
      "",
      transcript(dijkstraAdapter, "Start is the destination", lettered([[0, 1, 3]], 2, 0, 0), ["overview"]),
      "",
    ].join("\n");
    await expect(text).toMatchFileSnapshot("./__golden__/dijkstra.md");
  });
});
