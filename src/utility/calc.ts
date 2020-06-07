export const calculateCurve = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  var mpx = (x2 + x1) * 0.5;
  var mpy = (y2 + y1) * 0.5;

  // angle of perpendicular to line:
  var theta = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;

  // distance of control point from mid-point of line:
  var offset = 30;

  // location of control point:
  var c1x = mpx + offset * Math.cos(theta);
  var c1y = mpy + offset * Math.sin(theta);
  let directedPath = `M${x1} ${y1} Q${c1x} ${c1y} ${x2} ${y2}`;
  return directedPath;
};
export const calculateTextLoc = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  var mpx = (x2 + x1) * 0.5;
  var mpy = (y2 + y1) * 0.5;

  // angle of perpendicular to line:
  var theta = Math.atan2(y2 - y1, x2 - x1) - Math.PI / 2;

  // distance of control point from mid-point of line:
  var offset = 30;

  // location of control point:
  var c1x = mpx + offset * Math.cos(theta);
  var c1y = mpy + offset * Math.sin(theta);
  return { c1x, c1y };
};
//calculates accurate x2,y2 for the edge to just intersect the node
export const calculateAccurateCoords = (
  x1: number,
  y1: number,
  x2: number,
  y2: number
) => {
  let distance = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
  let d2 = distance - 30;
  let ratio = d2 / distance;
  let dx: any = (x2 - x1) * ratio;
  let dy: any = (y2 - y1) * ratio;
  let tempX = x1 + dx;
  let tempY = y1 + dy;
  return { tempX, tempY };
};
