import { INode, IEdge } from "../IGraph";

export interface NodeProps {
  node: INode;
  edges: Map<number, IEdge[] | undefined>;
  handleMove: (event: React.MouseEvent<SVGCircleElement>) => void;
  handleEdge: (edge: IEdge, node: INode) => void;
  deleteNodeMode: boolean;
  deleteEdgeMode: boolean;
  editEdgeMode: boolean;
  readyForVisualization: boolean;
  pathFindingNode: { startNodeId: number; endNodeId: number } | null;
}
