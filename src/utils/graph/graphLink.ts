/**
 * A graph carried in a URL (`?graph=`), so a landing page can hand the graph a
 * visitor arranged to the app. The value is untrusted: decoding validates every
 * field and returns null for anything malformed.
 *
 * Format: `x,y,label;x,y,label|from,to,weight,d;from,to,weight,u`
 * (node positions, then edges between node indexes; `d` directed, `u` undirected).
 */
import { EDGE } from "../../constants/graph";
import type { GraphSpec } from "./graphGenerator";

const MAX_NODES = 40;
const MAX_EDGES = 200;
/** Linked graphs are fitted into this box, centred on the canvas origin. */
const FIT = { halfWidth: 320, halfHeight: 210 };

export function encodeGraphLink(spec: GraphSpec): string {
  const xs = spec.nodes.map((n) => n.x);
  const ys = spec.nodes.map((n) => n.y);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const spanX = Math.max(1, Math.max(...xs) - Math.min(...xs));
  const spanY = Math.max(1, Math.max(...ys) - Math.min(...ys));
  const scale = Math.min((FIT.halfWidth * 2) / spanX, (FIT.halfHeight * 2) / spanY);
  const nodes = spec.nodes.map((n) => [Math.round((n.x - cx) * scale), Math.round((n.y - cy) * scale), n.label ?? ""].join(","));
  const edges = spec.edges.map((e) => [e.from, e.to, e.weight, e.directed ? "d" : "u"].join(","));
  return `${nodes.join(";")}|${edges.join(";")}`;
}

export function decodeGraphLink(value: string): GraphSpec | null {
  const [nodePart, edgePart = "", ...rest] = value.split("|");
  if (rest.length > 0 || !nodePart) return null;

  const nodes: GraphSpec["nodes"] = [];
  for (const chunk of nodePart.split(";")) {
    const [x, y, label = ""] = chunk.split(",");
    const nx = Number(x);
    const ny = Number(y);
    if (x === "" || y === "" || !Number.isFinite(nx) || !Number.isFinite(ny) || Math.abs(nx) > 5000 || Math.abs(ny) > 5000) return null;
    // Labels follow the app's own rule: up to five characters, no asterisks.
    nodes.push({ x: nx, y: ny, label: label.replace(/\*/g, "").slice(0, 5) || undefined });
  }
  if (nodes.length === 0 || nodes.length > MAX_NODES) return null;

  const edges: GraphSpec["edges"] = [];
  const seen = new Set<string>();
  for (const chunk of edgePart ? edgePart.split(";") : []) {
    const [f, t, w, kind] = chunk.split(",");
    const from = Number(f);
    const to = Number(t);
    const weight = Number(w);
    const inRange = (i: number) => Number.isInteger(i) && i >= 0 && i < nodes.length;
    if (!inRange(from) || !inRange(to) || from === to) return null;
    if (!Number.isInteger(weight) || weight < EDGE.MIN_WEIGHT || weight > EDGE.MAX_WEIGHT) return null;
    if (kind !== "d" && kind !== "u") return null;
    // One edge per pair of nodes, whichever way it points.
    const key = from < to ? `${from}-${to}` : `${to}-${from}`;
    if (seen.has(key)) return null;
    seen.add(key);
    edges.push({ from, to, weight, directed: kind === "d" });
  }
  if (edges.length > MAX_EDGES) return null;

  return { nodes, edges };
}
