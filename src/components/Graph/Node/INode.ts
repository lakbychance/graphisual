import { INode, IEdge } from "../IGraph";

export interface NodeProps {
  node: INode;
  edges: Map<number, IEdge[] | undefined>;
  handleMove: (event: React.PointerEvent<SVGCircleElement>) => void;
  handleEdge: (edge: IEdge, node: INode) => void;
  deleteNodeMode: boolean;
  deleteEdgeMode: boolean;
  editEdgeMode: boolean;
  readyForVisualization: boolean;
  readyForMovement: boolean;
  readyForEdge: boolean;
  pathFindingNode: { startNodeId: number; endNodeId: number } | null;
}
