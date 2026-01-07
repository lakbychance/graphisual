import { INode, IEdge } from "../IGraph";

export interface NodeProps {
  node: INode;
  edges: Map<number, IEdge[] | undefined>;
  onNodeMove: (nodeId: number, x: number, y: number) => void;
  onEdgeClick: (edge: IEdge, node: INode, clickPosition: { x: number; y: number }) => void;
  onConnectorDragStart: (
    sourceNode: INode,
    position: string,
    startX: number,
    startY: number
  ) => void;
  isVisualizing: boolean;
  isAlgorithmSelected: boolean;
  pathFindingNode: { startNodeId: number; endNodeId: number } | null;
  svgRef: React.RefObject<SVGSVGElement | null>;
  isSelected: boolean;
  onNodeSelect: (nodeId: number | null) => void;
  screenToSvgCoords: (clientX: number, clientY: number) => { x: number; y: number };
}
