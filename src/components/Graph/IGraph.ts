import { IDropdownOption } from "@fluentui/react";

import { IOptions } from "../Board/IBoard";
import { Dispatch, SetStateAction } from "react";
export interface GraphProps {
  options: IOptions;
  selectedEdge: IDropdownOption | undefined;
  selectedAlgo: IDropdownOption | undefined;
  setOptions: Dispatch<SetStateAction<IOptions>>;
  visualizationSpeed: number;
  setVisualizingState: Dispatch<SetStateAction<boolean>>;
}
export interface INode {
  x: number;
  y: number;
  r: number;
  id: number;
  isInShortestPath?: boolean;
  isVisited?: boolean;
  [key: string]: any;
}
export interface IEdge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  nodeX2: number;
  nodeY2: number;
  from: string;
  to: string;
  weight: number;
  type: string;
  isUsedInTraversal?: boolean;
  isUsedInShortestPath?: boolean;
  [key: string]: any;
}
