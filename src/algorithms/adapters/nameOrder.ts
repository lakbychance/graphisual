import type { AlgorithmInput } from "../types";

/** Names compare as people read them: "2" before "10", "B2" before "B10". */
const byName = new Intl.Collator("en", { numeric: true });

/**
 * The graph's nodes in the order of the names the canvas shows (a label, or else the node's number),
 * read naturally: lists of nodes in answers ("C, D and F cannot be reached") follow it (D66). The
 * order depends only on the names, so a graph opened from a link, whose nodes keep their names but
 * may get new numbers, lists them the same way. Two nodes with one name keep their numbers' order.
 */
export function nameOrder({ nodes }: AlgorithmInput): number[] {
  const named = nodes.map(({ id, label }) => ({ id, name: label || String(id) }));
  return named.sort((a, b) => byName.compare(a.name, b.name) || a.id - b.id).map((n) => n.id);
}
