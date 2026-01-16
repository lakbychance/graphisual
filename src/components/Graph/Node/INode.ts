import { IEdge } from "../IGraph";

export interface NodeProps {
  nodeId: number;
  onNodeMove: (nodeId: number, x: number, y: number) => void;
  onEdgeClick: (edge: IEdge, nodeId: number, clickPosition: { x: number; y: number }) => void;
  onConnectorDragStart: (
    sourceNodeId: number,
    position: string,
    startX: number,
    startY: number
  ) => void;
  isVisualizing: boolean;
  isAlgorithmSelected: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  onNodeSelect: (nodeId: number | null) => void;
  screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
}
