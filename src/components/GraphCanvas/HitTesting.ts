/**
 * Hit testing utilities for Canvas rendering.
 * Simple O(n) iteration - perfectly fine for 50-200 nodes.
 */

import type { GraphNode, GraphEdge } from "../Graph/types";
import { NODE, EDGE } from "../../constants/graph";
import { getControlPoint } from "../../utils/geometry/calc";

export type HitResult =
  | { type: 'node'; nodeId: number; node: GraphNode }
  | { type: 'edge'; edge: GraphEdge; sourceNodeId: number }
  | { type: 'connector'; nodeId: number; position: 'top' | 'right' | 'bottom' | 'left' }
  | null;

/**
 * Test if a point is inside a circle.
 */
function pointInCircle(
  px: number,
  py: number,
  cx: number,
  cy: number,
  radius: number
): boolean {
  const dx = px - cx;
  const dy = py - cy;
  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Calculate distance from point to a quadratic bezier curve.
 * Samples the curve at intervals and returns minimum distance.
 */
function distanceToQuadraticBezier(
  px: number,
  py: number,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  x2: number,
  y2: number,
  samples: number = 20
): number {
  let minDist = Infinity;

  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const t1 = 1 - t;

    // Quadratic bezier formula: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const bx = t1 * t1 * x1 + 2 * t1 * t * cx + t * t * x2;
    const by = t1 * t1 * y1 + 2 * t1 * t * cy + t * t * y2;

    const dx = px - bx;
    const dy = py - by;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDist) {
      minDist = dist;
    }
  }

  return minDist;
}

/**
 * Calculate distance from point to a line segment.
 */
function distanceToLineSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) {
    // Line segment is a point
    return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
  }

  // Project point onto line, clamped to segment
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / lengthSq));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
}


/**
 * Hit test a single node (including hit area padding).
 */
export function hitTestNode(
  worldX: number,
  worldY: number,
  node: GraphNode
): boolean {
  const hitRadius = node.r + NODE.HIT_AREA_PADDING;
  return pointInCircle(worldX, worldY, node.x, node.y, hitRadius);
}

/**
 * Hit test nodes in order (last in array = top of stack).
 * Returns topmost hit node.
 */
export function hitTestNodes(
  worldX: number,
  worldY: number,
  nodes: GraphNode[],
  stackingOrder: Set<number>
): GraphNode | null {
  // Convert stacking order to array (last = top)
  const orderedIds = [...stackingOrder];

  // Check in reverse order (top to bottom)
  for (let i = orderedIds.length - 1; i >= 0; i--) {
    const nodeId = orderedIds[i];
    const node = nodes.find(n => n.id === nodeId);
    if (node && hitTestNode(worldX, worldY, node)) {
      return node;
    }
  }

  return null;
}

/**
 * Hit test edge connectors (the small circles around a node).
 */
export function hitTestConnectors(
  worldX: number,
  worldY: number,
  node: GraphNode,
  connectorRadius: number = 8
): 'top' | 'right' | 'bottom' | 'left' | null {
  const positions = {
    top: { x: node.x, y: node.y - node.r - 8 },
    right: { x: node.x + node.r + 8, y: node.y },
    bottom: { x: node.x, y: node.y + node.r + 8 },
    left: { x: node.x - node.r - 8, y: node.y },
  };

  for (const [position, coords] of Object.entries(positions)) {
    if (pointInCircle(worldX, worldY, coords.x, coords.y, connectorRadius)) {
      return position as 'top' | 'right' | 'bottom' | 'left';
    }
  }

  return null;
}

/**
 * Hit test a single edge.
 */
export function hitTestEdge(
  worldX: number,
  worldY: number,
  edge: GraphEdge,
  threshold: number = EDGE.HIT_THRESHOLD
): boolean {
  if (edge.type === 'directed') {
    const { cx, cy } = getControlPoint(edge.x1, edge.y1, edge.x2, edge.y2);
    const dist = distanceToQuadraticBezier(worldX, worldY, edge.x1, edge.y1, cx, cy, edge.x2, edge.y2);
    return dist <= threshold;
  } else {
    const dist = distanceToLineSegment(worldX, worldY, edge.x1, edge.y1, edge.x2, edge.y2);
    return dist <= threshold;
  }
}

/**
 * Hit test all edges and return the first hit.
 */
export function hitTestEdges(
  worldX: number,
  worldY: number,
  edges: Map<number, GraphEdge[]>,
  threshold: number = EDGE.HIT_THRESHOLD
): { edge: GraphEdge; sourceNodeId: number } | null {
  for (const [sourceNodeId, nodeEdges] of edges) {
    for (const edge of nodeEdges) {
      if (hitTestEdge(worldX, worldY, edge, threshold)) {
        return { edge, sourceNodeId };
      }
    }
  }
  return null;
}

/**
 * Get all nodes within a rectangular selection box.
 */
export function nodesInRect(
  nodes: GraphNode[],
  x1: number,
  y1: number,
  x2: number,
  y2: number
): GraphNode[] {
  const left = Math.min(x1, x2);
  const right = Math.max(x1, x2);
  const top = Math.min(y1, y2);
  const bottom = Math.max(y1, y2);

  return nodes.filter(node =>
    node.x >= left && node.x <= right &&
    node.y >= top && node.y <= bottom
  );
}
