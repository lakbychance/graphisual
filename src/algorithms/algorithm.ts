import { Queue } from "../data-structures/Queue";
import { Stack } from "../data-structures/Stack";
export const bfs = (edges: any, startNode: any) => {
  const bfsQueue = new Queue();
  const visitedNodes = [];
  const visitedSet = new Set();
  bfsQueue.push(startNode);
  let newEdges = new Map(edges);
  while (!bfsQueue.isEmpty()) {
    let nodeId = bfsQueue.front();
    bfsQueue.pop();
    if (!visitedSet.has(nodeId)) {
      visitedNodes.push(nodeId);
      const neighbours = findNeighbours(nodeId, newEdges, visitedSet);
      neighbours.forEach((id: any) => {
        bfsQueue.push(id);
      });
    }
  }
  return visitedNodes;
};

export const dfs = (edges: any, startNode: any) => {
  const dfsStack = new Stack();
  const visitedNodes = [];
  const visitedSet = new Set();
  dfsStack.push(startNode);
  let newEdges = new Map(edges);
  while (!dfsStack.isEmpty()) {
    let nodeId = dfsStack.top();
    dfsStack.pop();
    if (!visitedSet.has(nodeId)) {
      visitedNodes.push(nodeId);
      const neighbours = findNeighbours(nodeId, newEdges, visitedSet);
      neighbours.forEach((id: any) => {
        dfsStack.push(id);
      });
    }
  }
  return visitedNodes;
};

export const dijkstra = (
  edges: any,
  startNodeId: any,
  endNodeId: any,
  nodes: any
) => {
  if (startNodeId === endNodeId)
    return { shortestPath: [startNodeId], visitedNodes: [startNodeId] };
  let newEdges = new Map(edges);
  let newNodes = [...nodes];
  let distance = new Map();
  let prev = new Map();
  let unvisitedSet = new Set();
  let visitedNodes: any = [];
  newNodes.forEach((node: any) => {
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
const backtrack = (prev: Map<any, any>, endNodeId: any) => {
  const visitedOrder = [];
  let currentNodeId = endNodeId;
  visitedOrder.push(currentNodeId);
  while (prev.has(currentNodeId)) {
    currentNodeId = prev.get(currentNodeId);
    visitedOrder.push(currentNodeId);
  }
  return visitedOrder.reverse();
};
const getSmallestUnvisited = (
  distance: Map<any, any>,
  unvisitedSet: Set<any>
) => {
  let smallestUnvisited: any = [];
  distance.forEach((value: any, key: any) => {
    if (unvisitedSet.has(key)) {
      smallestUnvisited.push(key);
    }
  });
  return smallestUnvisited.sort(
    (a: number, b: number) => distance.get(a) - distance.get(b)
  )[0];
};
const getUnvisitedNeighbours = (
  currentNodeId: any,
  edges: any,
  distance: any,
  unvisitedSet: Set<any>,
  prev: Map<any, any>
) => {
  if (edges.get(currentNodeId)) {
    edges.get(currentNodeId).forEach((edge: any) => {
      if (unvisitedSet.has(parseInt(edge.to))) {
        let newDistance = distance.get(currentNodeId) + edge.weight;
        if (newDistance < distance.get(parseInt(edge.to))) {
          distance.set(parseInt(edge.to), newDistance);
          prev.set(parseInt(edge.to), currentNodeId);
        }
      }
    });
  }
};

const findNeighbours = (nodeId: any, edges: any, visitedSet: any) => {
  if (!visitedSet.has(nodeId)) {
    visitedSet.add(nodeId);
    return edges.get(nodeId).map((edge: any) => {
      return parseInt(edge.to);
    });
  }
  return [];
};
