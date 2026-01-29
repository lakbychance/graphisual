import { GraphNode } from "../../components/Graph/types";

export type Direction = "up" | "down" | "left" | "right";

/**
 * Direction angles in radians.
 * Right = 0, Down = π/2, Left = π, Up = -π/2
 */
const DIRECTION_ANGLES: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/**
 * Calculates the angle from one point to another.
 * Returns angle in radians, range [-π, π].
 */
function angleBetweenPoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number
): number {
  return Math.atan2(toY - fromY, toX - fromX);
}

/**
 * Calculates Euclidean distance between two points.
 */
function distanceBetweenPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * Normalizes angle difference to range [-π, π].
 */
function normalizeAngleDiff(diff: number): number {
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
}

/**
 * Checks if an angle is within a sector centered on a direction.
 * @param angle - The angle to check
 * @param direction - The direction (center of sector)
 * @param sectorHalfAngle - Half the sector width in radians
 */
function isAngleInSector(
  angle: number,
  direction: Direction,
  sectorHalfAngle: number
): boolean {
  const directionAngle = DIRECTION_ANGLES[direction];
  const diff = normalizeAngleDiff(angle - directionAngle);
  return Math.abs(diff) <= sectorHalfAngle;
}

/**
 * Finds the nearest node in the specified direction from the current node.
 *
 * Algorithm:
 * 1. Define a 90° sector (±45°) centered on the direction
 * 2. Filter nodes within that sector
 * 3. Return the closest node by Euclidean distance
 * 4. If no node in strict sector, expand to 120° (±60°)
 * 5. If still no node, return null
 */
export function findNodeInDirection(
  currentNode: GraphNode,
  allNodes: GraphNode[],
  direction: Direction
): GraphNode | null {
  const otherNodes = allNodes.filter((n) => n.id !== currentNode.id);

  if (otherNodes.length === 0) {
    return null;
  }

  // Calculate angle and distance for each node
  const nodesWithMetrics = otherNodes.map((node) => ({
    node,
    angle: angleBetweenPoints(currentNode.x, currentNode.y, node.x, node.y),
    distance: distanceBetweenPoints(currentNode.x, currentNode.y, node.x, node.y),
  }));

  // Try 90° sector first (±45°)
  const strictSectorAngle = Math.PI / 4; // 45°
  let candidates = nodesWithMetrics.filter((item) =>
    isAngleInSector(item.angle, direction, strictSectorAngle)
  );

  // If no candidates, expand to 120° sector (±60°)
  if (candidates.length === 0) {
    const expandedSectorAngle = Math.PI / 3; // 60°
    candidates = nodesWithMetrics.filter((item) =>
      isAngleInSector(item.angle, direction, expandedSectorAngle)
    );
  }

  if (candidates.length === 0) {
    return null;
  }

  // Return the closest node
  candidates.sort((a, b) => a.distance - b.distance);
  return candidates[0].node;
}
