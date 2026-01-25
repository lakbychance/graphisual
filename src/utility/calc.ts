import { GraphNode } from "../components/Graph/types";
import { NODE } from "./constants";

export const calculateCurve = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const mpx = (x2 + x1) * 0.5;
  const mpy = (y2 + y1) * 0.5;

  // angle of perpendicular to line:
  const theta = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;

  // distance of control point from mid-point of line:
  const offset = NODE.RADIUS;

  // location of control point:
  const c1x = mpx + offset * Math.cos(theta);
  const c1y = mpy + offset * Math.sin(theta);
  const directedPath = `M${x1} ${y1} Q${c1x} ${c1y} ${x2} ${y2}`;
  return directedPath;
};
export const calculateTextLoc = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const mpx = (x2 + x1) * 0.5;
  const mpy = (y2 + y1) * 0.5;

  // angle of perpendicular to line:
  const theta = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;

  // distance of control point from mid-point of line:
  const offset = NODE.RADIUS;

  // location of control point:
  const c1x = mpx + offset * Math.cos(theta);
  const c1y = mpy + offset * Math.sin(theta);
  return { c1x, c1y };
};
//calculates accurate x2,y2 for the edge to just intersect the node
export const calculateAccurateCoords = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  const distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  const d2 = distance - NODE.RADIUS;
  const ratio = d2 / distance;
  const dx = (x2 - x1) * ratio;
  const dy = (y2 - y1) * ratio;
  const tempX = x1 + dx;
  const tempY = y1 + dy;
  return { tempX, tempY };
};
//find the to Node for the edge drawn for touch based devices
export const findToNodeForTouchBasedDevices = (
  x: number,
  y: number,
  nodes: GraphNode[]
) => {
  return nodes.find((node: GraphNode) =>
    doesPointLieOnCircle(x, y, NODE.RADIUS, node.x, node.y)
  );
};

//test if point lies on the circle
export const doesPointLieOnCircle = (
  centerX: number,
  centerY: number,
  radius: number,
  pointX: number,
  pointY: number
) => {
  const difference = Math.sqrt(
    Math.pow(centerX - pointX, 2) + Math.pow(centerY - pointY, 2)
  );
  return difference <= radius;
};
