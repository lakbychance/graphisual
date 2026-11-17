import { describe, expect, it } from "vitest";
import { decodeGraphLink, encodeGraphLink } from "./graphLink";
import { graphFromSpec, type GraphSpec } from "./graphGenerator";

const spec: GraphSpec = {
  nodes: [{ x: 100, y: 400, label: "A" }, { x: 500, y: 300, label: "B" }, { x: 900, y: 500 }],
  edges: [{ from: 0, to: 1, weight: 4, directed: false }, { from: 1, to: 2, weight: -3, directed: true }],
};

describe("graph link", () => {
  it("round-trips labels, weights and direction", () => {
    const decoded = decodeGraphLink(encodeGraphLink(spec));
    expect(decoded?.nodes.map((n) => n.label)).toEqual(["A", "B", undefined]);
    expect(decoded?.edges).toEqual(spec.edges);
  });

  it("centres the graph and fits it to the canvas box", () => {
    const decoded = decodeGraphLink(encodeGraphLink(spec));
    const xs = decoded!.nodes.map((n) => n.x);
    const ys = decoded!.nodes.map((n) => n.y);
    expect(Math.min(...xs)).toBe(-Math.max(...xs));
    expect(Math.max(...xs)).toBeLessThanOrEqual(320);
    expect(Math.max(...ys.map(Math.abs))).toBeLessThanOrEqual(210);
  });

  it("builds app edges, with a reverse edge for undirected ones", () => {
    const graph = graphFromSpec(decodeGraphLink(encodeGraphLink(spec))!);
    expect(graph.nodes.map((n) => n.id)).toEqual([1, 2, 3]);
    expect(graph.edges.get(1)?.map((e) => e.to)).toEqual([2]);
    expect(graph.edges.get(2)?.map((e) => e.to)).toEqual([1, 3]);
    expect(graph.edges.get(3)).toEqual([]);
    expect(graph.nodeCounter).toBe(3);
  });

  it.each([
    ["", "empty"],
    ["1,2,A|0,0,1,u", "self loop"],
    ["1,2,A;3,4,B|0,5,1,u", "edge to a missing node"],
    ["1,2,A;3,4,B|0,1,1.5,u", "fractional weight"],
    ["1,2,A;3,4,B|0,1,99999,u", "weight out of range"],
    ["1,2,A;3,4,B|0,1,1,x", "unknown edge kind"],
    ["1,2,A;3,4,B|0,1,1,u;1,0,2,d", "duplicate edge"],
    ["1,NaN,A", "non-numeric position"],
    ["1,2,A|0,1,1,u|extra", "extra section"],
  ])("rejects %s (%s)", (value) => {
    expect(decodeGraphLink(value)).toBeNull();
  });

  it("strips characters the app does not allow in labels", () => {
    expect(decodeGraphLink("1,2,**LongLabel")?.nodes[0].label).toBe("LongL");
  });
});
