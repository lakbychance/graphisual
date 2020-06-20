import { Queue } from "../data-structures/Queue";
import { Stack } from "../data-structures/Stack";
import { IEdge, INode } from "../components/Graph/IGraph";

export interface IPathFinding {
  visitedNodes: number[];
  shortestPath: number[];
}
export const bfs = (
  edges: Map<number, IEdge[] | undefined>,
  startNodeId: number
): number[] => {
  const bfsQueue = new Queue();
  const visitedNodes: number[] = [];
  const visitedSet = new Set<number>();
  bfsQueue.push(startNodeId);
  let newEdges = new Map(edges);
  while (!bfsQueue.isEmpty()) {
    let nodeId = bfsQueue.front();
    bfsQueue.pop();
    if (!visitedSet.has(nodeId)) {
      visitedNodes.push(nodeId);
      const neighbours = findNeighbours(nodeId, newEdges, visitedSet);
      neighbours?.forEach((id: number) => {
        bfsQueue.push(id);
      });
    }
  }
  return visitedNodes;
};

export const dfs = (
  edges: Map<number, IEdge[] | undefined>,
  startNodeId: number
): number[] => {
  const dfsStack = new Stack();
  const visitedNodes: number[] = [];
  const visitedSet = new Set<number>();
  dfsStack.push(startNodeId);
  let newEdges = new Map(edges);
  while (!dfsStack.isEmpty()) {
    let nodeId = dfsStack.top();
    dfsStack.pop();
    if (!visitedSet.has(nodeId)) {
      visitedNodes.push(nodeId);
      const neighbours = findNeighbours(nodeId, newEdges, visitedSet);
      neighbours?.forEach((id: number) => {
        dfsStack.push(id);
      });
    }
  }
  return visitedNodes;
};

export const dijkstra = (
  edges: Map<number, IEdge[] | undefined>,
  startNodeId: number,
  endNodeId: number,
  nodes: INode[]
): IPathFinding | undefined => {
  if (startNodeId === endNodeId)
    return { shortestPath: [startNodeId], visitedNodes: [startNodeId] };
  let newEdges = new Map(edges);
  let newNodes = [...nodes];
  let distance = new Map();
  let prev = new Map();
  let unvisitedSet = new Set<number>();
  let visitedNodes: number[] = [];
  newNodes.forEach((node: INode) => {
    distance.set(node.id, Infinity);
    unvisitedSet.add(node.id);
  });
  distance.set(startNodeId, 0);
  let currentNodeId = startNodeId;
  visitedNodes.push(currentNodeId);
  unvisitedSet.delete(currentNodeId);
  while (unvisitedSet.size !== 0) {
    getUnvisitedNeighbours(
      currentNodeId,
      newEdges,
      distance,
      unvisitedSet,
      prev
    );
    currentNodeId = getSmallestUnvisited(distance, unvisitedSet);
    if (distance.get(currentNodeId) === Infinity) {
      return {
        shortestPath: [],
        visitedNodes: visitedNodes,
      };
    }
    visitedNodes.push(currentNodeId);
    unvisitedSet.delete(currentNodeId);
    if (currentNodeId === endNodeId)
      return {
        shortestPath: backtrack(prev, endNodeId),
        visitedNodes: visitedNodes,
      };
  }
};
const backtrack = (prev: Map<number, number>, endNodeId: number) => {
  const visitedOrder = [];
  let currentNodeId = endNodeId;
  visitedOrder.push(currentNodeId);
  while (prev.has(currentNodeId)) {
    currentNodeId = prev.get(currentNodeId)!;
    visitedOrder.push(currentNodeId);
  }
  return visitedOrder.reverse();
};
const getSmallestUnvisited = (
  distance: Map<number, number>,
  unvisitedSet: Set<number>
) => {
  let smallestUnvisited: number[] = [];
  distance.forEach((_value: number, key: number) => {
    if (unvisitedSet.has(key)) {
      smallestUnvisited.push(key);
    }
  });
  return smallestUnvisited.sort(
    (a: number, b: number) => distance.get(a)! - distance.get(b)!
  )[0];
};
const getUnvisitedNeighbours = (
  currentNodeId: number,
  edges: Map<number, IEdge[] | undefined>,
  distance: Map<number, number>,
  unvisitedSet: Set<number>,
  prev: Map<number, number>
) => {
  if (edges.get(currentNodeId)) {
    edges.get(currentNodeId)?.forEach((edge: IEdge) => {
      if (unvisitedSet.has(parseInt(edge.to))) {
        let newDistance = distance.get(currentNodeId)! + edge.weight;
        if (newDistance < distance.get(parseInt(edge.to))!) {
          distance.set(parseInt(edge.to), newDistance);
          prev.set(parseInt(edge.to), currentNodeId);
        }
      }
    });
  }
};

const findNeighbours = (
  nodeId: number,
  edges: Map<number, IEdge[] | undefined>,
  visitedSet: Set<number>
) => {
  if (!visitedSet.has(nodeId)) {
    visitedSet.add(nodeId);
    return edges.get(nodeId)?.map((edge: IEdge) => {
      return parseInt(edge.to);
    });
  }
  return [];
};
