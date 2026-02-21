export interface PreviewEdge {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

export interface HoveredEdge {
  sourceNodeId: number;
  toNodeId: number;
}
