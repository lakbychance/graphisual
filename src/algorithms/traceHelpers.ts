/**
 * Marks a node ID in a trace message string.
 * The TracePanel will resolve this placeholder to the node's custom label when available,
 * falling back to the numeric ID string. All other numbers in messages (distances,
 * weights, counts, depths) should be embedded directly — not wrapped with this helper.
 *
 * @example
 * message: `**Visiting node ${nid(nodeId)}**, added **${addedToQueue.map(nid).join(", ")}** to queue`
 * // Renders as: "Visiting node S, added A, B to queue" (when labels are set)
 */
export const nid = (id: number): string => `{n:${id}}`;
