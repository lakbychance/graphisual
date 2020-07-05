import { Queue } from "../data-structures/Queue";
import { Stack } from "../data-structures/Stack";
import { IEdge, INode } from "../components/Graph/IGraph";
import { cloneDeep } from "lodash";

export interface IPathFinding {
  visitedEdges: IEdge[];
  shortestPath: IEdge[];
}
export const bfs = (
  edges: Map<number, IEdge[] | undefined>,
  startNodeId: number
): IEdge[] => {
  const bfsQueue = new Queue<IEdge>();
  const visitedEdges: IEdge[] = [];
  const mockEdge: IEdge = {
    x1: NaN,
    x2: NaN,
    y1: NaN,
    y2: NaN,
    nodeX2: NaN,
    nodeY2: NaN,
    from: "Infinity",
    to: startNodeId.toString(),
    type: "directed",
    weight: NaN,
    isUsedInTraversal: false,
  };
  const visitedSet = new Set<number>();
  bfsQueue.push(mockEdge);
  let newEdges = new Map(edges);
  while (!bfsQueue.isEmpty()) {
    let lastVisitedEdge = bfsQueue.front();
    let nodeId = parseInt(lastVisitedEdge!.to);
    bfsQueue.pop();
    if (!visitedSet.has(nodeId)) {
      visitedEdges.push({
        ...mockEdge,
        from: lastVisitedEdge!.from,
        to: lastVisitedEdge!.to,
      });
      const neighbours = findNeighbours(nodeId, newEdges, visitedSet);
      neighbours?.forEach((id: number) => {
        bfsQueue.push({
          ...mockEdge,
          from: nodeId.toString(),
          to: id.toString(),
        });
      });
    }
  }
  return visitedEdges;
};

export const dfs = (
  edges: Map<number, IEdge[] | undefined>,
  startNodeId: number
): IEdge[] => {
  let dfsStack = new Stack<IEdge>();
  const mockEdge: IEdge = {
    x1: NaN,
    x2: NaN,
    y1: NaN,
    y2: NaN,
    nodeX2: NaN,
    nodeY2: NaN,
    from: "Infinity",
    to: startNodeId.toString(),
    type: "directed",
    weight: NaN,
    isUsedInTraversal: false,
  };
  dfsStack.push(mockEdge);
  const visitedSet = new Set<number>();
  const visitedEdges: IEdge[] = [];
  let newEdges = new Map(edges);
  while (!dfsStack.isEmpty()) {
    let lastVisitedEdge = dfsStack.top();
    let nodeId = parseInt(lastVisitedEdge!.to);
    dfsStack.pop();
    if (!visitedSet.has(parseInt(lastVisitedEdge!.to))) {
      visitedEdges.push({
        ...mockEdge,
        from: lastVisitedEdge!.from,
        to: lastVisitedEdge!.to,
      });

      const neighbours = findNeighbours(nodeId, newEdges, visitedSet);
      neighbours?.forEach((id: number) => {
        dfsStack.push({
          ...mockEdge,
          from: nodeId.toString(),
          to: id.toString(),
        });
      });
    }
  }
  return visitedEdges;
};

export const dijkstra = (
  edges: Map<number, IEdge[] | undefined>,
  startNodeId: number,
  endNodeId: number
): IPathFinding | undefined => {
  const mockEdge: IEdge = {
    x1: NaN,
    x2: NaN,
    y1: NaN,
    y2: NaN,
    nodeX2: NaN,
    nodeY2: NaN,
    from: "Infinity",
    to: startNodeId.toString(),
    type: "directed",
    weight: NaN,
    isUsedInTraversal: false,
  };
  if (startNodeId === endNodeId)
    return { shortestPath: [mockEdge], visitedEdges: [mockEdge] };
  let newEdges = new Map(edges);
  let distance = new Map<IEdge, number>();
  let prev = new Map<number, number>();
  let unvisitedSet = new Set<number>();
  let visitedEdges: IEdge[] = [];
  distance.set(mockEdge, 0);
  newEdges.forEach((edges: IEdge[] | undefined, nodeId: number) => {
    edges?.forEach((edge: IEdge) => {
      distance.set(edge, Infinity);
    });
    unvisitedSet.add(nodeId);
  });
  let currentEdge: IEdge = mockEdge;
  let currentNodeId = parseInt(currentEdge.to);
  visitedEdges.push(currentEdge);
  unvisitedSet.delete(currentNodeId);
  while (unvisitedSet.size !== 0) {
    getUnvisitedNeighbours(currentEdge, newEdges, distance, unvisitedSet, prev);
    currentEdge = getSmallestUnvisited(distance, unvisitedSet);
    if (currentEdge === undefined || distance.get(currentEdge) === Infinity) {
      return {
        shortestPath: [],
        visitedEdges: visitedEdges,
      };
    }
    currentNodeId = parseInt(currentEdge.to);
    visitedEdges.push(currentEdge);
    unvisitedSet.delete(currentNodeId);
    if (currentNodeId === endNodeId) {
      return {
        shortestPath: backtrack(prev, startNodeId, endNodeId),
        visitedEdges: visitedEdges,
      };
    }
  }
};
const backtrack = (
  prev: Map<number, number>,
  startNodeId: number,
  endNodeId: number
) => {
  const mockEdge: IEdge = {
    x1: NaN,
    x2: NaN,
    y1: NaN,
    y2: NaN,
    nodeX2: NaN,
    nodeY2: NaN,
    from: "Infinity",
    to: startNodeId.toString(),
    type: "directed",
    weight: NaN,
    isUsedInTraversal: false,
  };
  const visitedOrder = [];
  const visitedEdges: IEdge[] = [];
  let currentNodeId = endNodeId;
  visitedOrder.push(currentNodeId);
  while (prev.has(currentNodeId)) {
    currentNodeId = prev.get(currentNodeId)!;
    visitedOrder.push(currentNodeId);
  }
  visitedOrder.reverse();
  visitedEdges.push(mockEdge);
  for (let i = 0; i < visitedOrder.length - 1; i++) {
    visitedEdges.push({
      ...mockEdge,
      from: visitedOrder[i].toString(),
      to: visitedOrder[i + 1].toString(),
    });
  }
  return visitedEdges;
};
const getSmallestUnvisited = (
  distance: Map<IEdge, number>,
  unvisitedSet: Set<number>
) => {
  let smallestUnvisited: IEdge[] = [];
  distance.forEach((_value: number, edge: IEdge) => {
    if (unvisitedSet.has(parseInt(edge.to))) {
      smallestUnvisited.push(edge);
    }
  });
  return smallestUnvisited.sort(
    (a: IEdge, b: IEdge) => distance.get(a)! - distance.get(b)!
  )[0];
};
const getUnvisitedNeighbours = (
  currentEdge: IEdge,
  edges: Map<number, IEdge[] | undefined>,
  distance: Map<IEdge, number>,
  unvisitedSet: Set<number>,
  prev: Map<number, number>
) => {
  let currentNodeId = parseInt(currentEdge.to);
  if (edges.get(currentNodeId)) {
    edges.get(currentNodeId)?.forEach((edge: IEdge) => {
      if (unvisitedSet.has(parseInt(edge.to))) {
        let shouldCompare = true;
        let newDistance = distance.get(currentEdge)! + edge.weight;
        distance.forEach((value: number, d_edge: IEdge) => {
          if (
            edge.to === d_edge.to &&
            value !== Infinity &&
            value <= newDistance
          ) {
            shouldCompare = false;
          }
        });
        if (shouldCompare && newDistance < distance.get(edge)!) {
          distance.set(edge, newDistance);
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

export const minspantreeprims = (
  edges: Map<number, IEdge[] | undefined>,
  nodes: INode[],
  startNodeId: number
) => {
  let mstSet = new Set<number>();
  let visitedEdges: IEdge[] = [];
  let nodeMap = new Map<number, number>();
  let prev = new Map<number, number>();
  let isGraphNotEligible: boolean | undefined = false;
  let newEdges = cloneDeep(edges);
  newEdges.forEach((edges: IEdge[] | undefined) => {
    isGraphNotEligible =
      isGraphNotEligible ||
      edges?.some((edge: IEdge) => edge.type === "directed");
  });
  if (isGraphNotEligible) {
    return [];
  }
  edges.forEach((_value: IEdge[] | undefined, nodeId: number) => {
    nodeMap.set(nodeId, Infinity);
  });
  nodeMap.set(startNodeId, 0);
  prev.set(startNodeId, Infinity);
  for (let i = 0; i < nodes.length - 1; i++) {
    let minimumNodeId = getFromNotIncludedInMST(newEdges, mstSet, nodeMap);
    mstSet.add(minimumNodeId);
    newEdges.get(minimumNodeId)?.forEach((edge: IEdge) => {
      const nodeId = parseInt(edge.to);
      if (!mstSet.has(nodeId) && edge.weight < nodeMap.get(nodeId)!) {
        nodeMap.set(nodeId, edge.weight);
        prev.set(nodeId, minimumNodeId);
      }
    });
  }

  visitedEdges = getVisitedEdges(prev, visitedEdges, nodes, startNodeId);
  return nodes.length === visitedEdges.length ? visitedEdges : [];
};

const getVisitedEdges = (
  prev: Map<number, number>,
  visitedEdges: IEdge[],
  nodes: INode[],
  startNodeId: number
) => {
  const mockEdge: IEdge = {
    x1: NaN,
    x2: NaN,
    y1: NaN,
    y2: NaN,
    nodeX2: NaN,
    nodeY2: NaN,
    from: "Infinity",
    to: startNodeId.toString(),
    type: "directed",
    weight: NaN,
    isUsedInTraversal: false,
  };

  for (let i = 0; i < nodes.length; i++) {
    if (prev.get(nodes[i].id)! !== undefined) {
      visitedEdges.push({
        ...mockEdge,
        from: prev.get(nodes[i].id)!?.toString(),
        to: nodes[i].id.toString(),
      });
    }
  }
  return visitedEdges;
};
const getFromNotIncludedInMST = (
  edges: Map<number, IEdge[] | undefined>,
  mstSet: Set<number>,
  nodeMap: Map<number, number>
) => {
  let minimumWeight: number | undefined = Infinity;
  let minimumNodeId: number;
  edges.forEach((_value: IEdge[] | undefined, nodeId: number) => {
    if (!mstSet.has(nodeId) && nodeMap.get(nodeId)! < minimumWeight!) {
      minimumWeight = nodeMap.get(nodeId);
      minimumNodeId = nodeId;
    }
  });
  return minimumNodeId!;
};
