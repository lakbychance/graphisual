import { INode, IEdge } from "../components/Graph/IGraph";
import { NODE } from "./constants";
import { calculateAccurateCoords } from "./calc";
import { EDGE_TYPE, type EdgeType } from "../constants";

export interface GeneratedGraph {
  nodes: INode[];
  edges: Map<number, IEdge[]>;
  nodeCounter: number;
}

export type LayoutType = "circular" | "random" | "grid";

export interface RandomGeneratorOptions {
  nodeCount: number;
  edgeDensity: number; // 0-1
  directed: boolean;
  weighted: boolean;
  minWeight?: number;
  maxWeight?: number;
  layout?: LayoutType;
}

// Layout dimensions (graphs are centered at origin)
const LAYOUT_WIDTH = 600;
const LAYOUT_HEIGHT = 400;
const HALF_WIDTH = LAYOUT_WIDTH / 2;
const HALF_HEIGHT = LAYOUT_HEIGHT / 2;

/**
 * Create an edge between two nodes
 */
function createEdge(
  fromNode: INode,
  toNode: INode,
  type: EdgeType,
  weight: number = 0
): IEdge {
  const { tempX, tempY } = calculateAccurateCoords(
    fromNode.x,
    fromNode.y,
    toNode.x,
    toNode.y
  );

  return {
    x1: fromNode.x,
    y1: fromNode.y,
    x2: tempX,
    y2: tempY,
    nodeX2: toNode.x,
    nodeY2: toNode.y,
    from: fromNode.id.toString(),
    to: toNode.id.toString(),
    weight,
    type,
  };
}

/**
 * Add edge to edges map (handles both directions for undirected)
 */
function addEdgeToMap(
  edges: Map<number, IEdge[]>,
  fromNode: INode,
  toNode: INode,
  type: EdgeType,
  weight: number = 0
): void {
  const edge = createEdge(fromNode, toNode, type, weight);
  const fromEdges = edges.get(fromNode.id) || [];
  fromEdges.push(edge);
  edges.set(fromNode.id, fromEdges);

  // For undirected edges, add reverse edge
  if (type === EDGE_TYPE.UNDIRECTED) {
    const reverseEdge = createEdge(toNode, fromNode, type, weight);
    const toEdges = edges.get(toNode.id) || [];
    toEdges.push(reverseEdge);
    edges.set(toNode.id, toEdges);
  }
}

/**
 * Generate random weight within range
 */
function randomWeight(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Layout nodes in a circle
 */
function circularLayout(count: number, centerX: number, centerY: number, radius: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  }
  return positions;
}

/**
 * Layout nodes randomly scattered (centered at origin)
 */
function randomLayout(count: number, halfWidth: number, halfHeight: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const minDistance = 60; // Minimum distance between nodes to avoid overlap

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x: number, y: number;

    do {
      x = -halfWidth + Math.random() * (2 * halfWidth);
      y = -halfHeight + Math.random() * (2 * halfHeight);
      attempts++;
    } while (
      attempts < 100 &&
      positions.some(pos => Math.hypot(pos.x - x, pos.y - y) < minDistance)
    );

    positions.push({ x, y });
  }
  return positions;
}

/**
 * Layout nodes in a grid pattern (centered at origin)
 */
function gridLayout(count: number, halfWidth: number, halfHeight: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  // Calculate optimal grid dimensions
  const aspectRatio = halfWidth / halfHeight;
  let cols = Math.ceil(Math.sqrt(count * aspectRatio));
  const rows = Math.ceil(count / cols);

  // Adjust if we have too many cells
  while (cols * rows < count) {
    cols++;
  }

  const totalWidth = 2 * halfWidth;
  const totalHeight = 2 * halfHeight;
  const cellWidth = totalWidth / (cols - 1 || 1);
  const cellHeight = totalHeight / (rows - 1 || 1);

  let nodeIdx = 0;
  for (let row = 0; row < rows && nodeIdx < count; row++) {
    for (let col = 0; col < cols && nodeIdx < count; col++) {
      positions.push({
        x: -halfWidth + col * cellWidth,
        y: -halfHeight + row * cellHeight,
      });
      nodeIdx++;
    }
  }

  return positions;
}

/**
 * Generate a random graph (centered at origin)
 */
export function generateRandomGraph(options: RandomGeneratorOptions): GeneratedGraph {
  const { nodeCount, edgeDensity, directed, weighted, minWeight = 1, maxWeight = 10, layout = "circular" } = options;

  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  // Get positions based on layout type (all centered at origin)
  const radius = Math.min(HALF_WIDTH, HALF_HEIGHT);

  let positions: { x: number; y: number }[];
  switch (layout) {
    case "random":
      positions = randomLayout(nodeCount, HALF_WIDTH, HALF_HEIGHT);
      break;
    case "grid":
      positions = gridLayout(nodeCount, HALF_WIDTH, HALF_HEIGHT);
      break;
    case "circular":
    default:
      positions = circularLayout(nodeCount, 0, 0, radius);
      break;
  }

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: i + 1,
      x: positions[i].x,
      y: positions[i].y,
      r: NODE.RADIUS,
    });
    edges.set(i + 1, []);
  }

  // Calculate max possible edges
  const maxEdges = directed
    ? nodeCount * (nodeCount - 1)
    : (nodeCount * (nodeCount - 1)) / 2;
  const targetEdges = Math.floor(maxEdges * edgeDensity);

  // Generate random edges
  const edgeType = directed ? EDGE_TYPE.DIRECTED : EDGE_TYPE.UNDIRECTED;
  const addedEdges = new Set<string>();
  let edgeCount = 0;

  while (edgeCount < targetEdges) {
    const fromIdx = Math.floor(Math.random() * nodeCount);
    const toIdx = Math.floor(Math.random() * nodeCount);

    if (fromIdx === toIdx) continue;

    const edgeKey = directed
      ? `${fromIdx}-${toIdx}`
      : `${Math.min(fromIdx, toIdx)}-${Math.max(fromIdx, toIdx)}`;

    if (addedEdges.has(edgeKey)) continue;

    addedEdges.add(edgeKey);
    const weight = weighted ? randomWeight(minWeight, maxWeight) : 0;
    addEdgeToMap(edges, nodes[fromIdx], nodes[toIdx], edgeType, weight);
    edgeCount++;
  }

  return { nodes, edges, nodeCounter: nodeCount };
}

/**
 * Generate a path graph (linear chain, centered at origin)
 */
export function generatePath(nodeCount: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const totalWidth = LAYOUT_WIDTH;
  const spacing = totalWidth / (nodeCount - 1 || 1);

  // Create nodes (centered at origin)
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: i + 1,
      x: -HALF_WIDTH + i * spacing,
      y: 0,
      r: NODE.RADIUS,
    });
    edges.set(i + 1, []);
  }

  // Create edges
  for (let i = 0; i < nodeCount - 1; i++) {
    addEdgeToMap(edges, nodes[i], nodes[i + 1], EDGE_TYPE.UNDIRECTED);
  }

  return { nodes, edges, nodeCounter: nodeCount };
}

/**
 * Generate a cycle graph (centered at origin)
 */
export function generateCycle(nodeCount: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const radius = Math.min(HALF_WIDTH, HALF_HEIGHT);
  const positions = circularLayout(nodeCount, 0, 0, radius);

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: i + 1,
      x: positions[i].x,
      y: positions[i].y,
      r: NODE.RADIUS,
    });
    edges.set(i + 1, []);
  }

  // Create edges (including closing edge)
  for (let i = 0; i < nodeCount; i++) {
    const nextIdx = (i + 1) % nodeCount;
    addEdgeToMap(edges, nodes[i], nodes[nextIdx], EDGE_TYPE.UNDIRECTED);
  }

  return { nodes, edges, nodeCounter: nodeCount };
}

/**
 * Generate a complete graph (K_n, centered at origin)
 */
export function generateComplete(nodeCount: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const radius = Math.min(HALF_WIDTH, HALF_HEIGHT);
  const positions = circularLayout(nodeCount, 0, 0, radius);

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: i + 1,
      x: positions[i].x,
      y: positions[i].y,
      r: NODE.RADIUS,
    });
    edges.set(i + 1, []);
  }

  // Create all possible edges
  for (let i = 0; i < nodeCount; i++) {
    for (let j = i + 1; j < nodeCount; j++) {
      addEdgeToMap(edges, nodes[i], nodes[j], EDGE_TYPE.UNDIRECTED);
    }
  }

  return { nodes, edges, nodeCounter: nodeCount };
}

/**
 * Generate a star graph (centered at origin)
 */
export function generateStar(nodeCount: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  // Center node at origin
  nodes.push({
    id: 1,
    x: 0,
    y: 0,
    r: NODE.RADIUS,
  });
  edges.set(1, []);

  // Outer nodes
  const radius = Math.min(HALF_WIDTH, HALF_HEIGHT);
  const outerCount = nodeCount - 1;
  const positions = circularLayout(outerCount, 0, 0, radius);

  for (let i = 0; i < outerCount; i++) {
    nodes.push({
      id: i + 2,
      x: positions[i].x,
      y: positions[i].y,
      r: NODE.RADIUS,
    });
    edges.set(i + 2, []);

    // Connect to center
    addEdgeToMap(edges, nodes[0], nodes[i + 1], EDGE_TYPE.UNDIRECTED);
  }

  return { nodes, edges, nodeCounter: nodeCount };
}

/**
 * Generate a binary tree (centered at origin)
 */
export function generateBinaryTree(depth: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const nodeCount = Math.pow(2, depth) - 1;
  const levelHeight = LAYOUT_HEIGHT / (depth - 1 || 1);

  let nodeId = 1;

  // Create nodes level by level (centered at origin)
  for (let level = 0; level < depth; level++) {
    const nodesInLevel = Math.pow(2, level);
    const spacing = LAYOUT_WIDTH / (nodesInLevel + 1);

    for (let i = 0; i < nodesInLevel; i++) {
      if (nodeId > nodeCount) break;

      nodes.push({
        id: nodeId,
        x: -HALF_WIDTH + spacing * (i + 1),
        y: -HALF_HEIGHT + level * levelHeight,
        r: NODE.RADIUS,
      });
      edges.set(nodeId, []);
      nodeId++;
    }
  }

  // Create edges (parent to children)
  for (let i = 0; i < nodes.length; i++) {
    const leftChildIdx = 2 * i + 1;
    const rightChildIdx = 2 * i + 2;

    if (leftChildIdx < nodes.length) {
      addEdgeToMap(edges, nodes[i], nodes[leftChildIdx], EDGE_TYPE.UNDIRECTED);
    }
    if (rightChildIdx < nodes.length) {
      addEdgeToMap(edges, nodes[i], nodes[rightChildIdx], EDGE_TYPE.UNDIRECTED);
    }
  }

  return { nodes, edges, nodeCounter: nodes.length };
}

/**
 * Generate a DAG (Directed Acyclic Graph, centered at origin)
 * Creates a layered structure where edges only go from earlier to later layers
 */
export function generateDAG(layers: number, nodesPerLayer: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const layerHeight = LAYOUT_HEIGHT / (layers - 1 || 1);

  // Create nodes layer by layer (centered at origin)
  let nodeId = 1;
  const layerNodes: INode[][] = [];

  for (let layer = 0; layer < layers; layer++) {
    const spacing = LAYOUT_WIDTH / (nodesPerLayer + 1);
    const currentLayerNodes: INode[] = [];

    for (let i = 0; i < nodesPerLayer; i++) {
      const node: INode = {
        id: nodeId,
        x: -HALF_WIDTH + spacing * (i + 1),
        y: -HALF_HEIGHT + layer * layerHeight,
        r: NODE.RADIUS,
      };
      nodes.push(node);
      currentLayerNodes.push(node);
      edges.set(nodeId, []);
      nodeId++;
    }

    layerNodes.push(currentLayerNodes);
  }

  // Create edges between consecutive layers
  // Each node connects to 1-2 random nodes in the next layer
  for (let layer = 0; layer < layers - 1; layer++) {
    const currentLayer = layerNodes[layer];
    const nextLayer = layerNodes[layer + 1];

    for (const node of currentLayer) {
      // Connect to 1-2 nodes in the next layer
      const connectionCount = Math.min(1 + Math.floor(Math.random() * 2), nextLayer.length);
      const shuffled = [...nextLayer].sort(() => Math.random() - 0.5);

      for (let i = 0; i < connectionCount; i++) {
        addEdgeToMap(edges, node, shuffled[i], EDGE_TYPE.DIRECTED);
      }
    }

    // Ensure every node in the next layer has at least one incoming edge
    for (const nextNode of nextLayer) {
      const hasIncoming = currentLayer.some((fromNode) => {
        const fromEdges = edges.get(fromNode.id) || [];
        return fromEdges.some((e) => e.to === nextNode.id.toString());
      });

      if (!hasIncoming) {
        // Connect from a random node in the current layer
        const randomFrom = currentLayer[Math.floor(Math.random() * currentLayer.length)];
        addEdgeToMap(edges, randomFrom, nextNode, EDGE_TYPE.DIRECTED);
      }
    }
  }

  return { nodes, edges, nodeCounter: nodes.length };
}

/**
 * Generate a grid graph (centered at origin)
 */
export function generateGrid(rows: number, cols: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const cellWidth = LAYOUT_WIDTH / (cols - 1 || 1);
  const cellHeight = LAYOUT_HEIGHT / (rows - 1 || 1);

  // Create nodes (centered at origin)
  let nodeId = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      nodes.push({
        id: nodeId,
        x: -HALF_WIDTH + col * cellWidth,
        y: -HALF_HEIGHT + row * cellHeight,
        r: NODE.RADIUS,
      });
      edges.set(nodeId, []);
      nodeId++;
    }
  }

  // Create edges (horizontal and vertical)
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;

      // Right neighbor
      if (col < cols - 1) {
        addEdgeToMap(edges, nodes[idx], nodes[idx + 1], EDGE_TYPE.UNDIRECTED);
      }

      // Bottom neighbor
      if (row < rows - 1) {
        addEdgeToMap(edges, nodes[idx], nodes[idx + cols], EDGE_TYPE.UNDIRECTED);
      }
    }
  }

  return { nodes, edges, nodeCounter: nodes.length };
}

/**
 * Generate a weighted graph for pathfinding demonstrations (e.g., Dijkstra's algorithm)
 * Creates a network-style layout with varied edge weights (centered at origin)
 */
export function generateWeighted(): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  // Hand-crafted network-style positions (scattered, not geometric)
  // Centered at origin - positions range from roughly -300 to 300
  const positions: { x: number; y: number }[] = [
    { x: -280, y: -190 },   // 1: top-left start area
    { x: -120, y: -210 },   // 2: top-center
    { x: 50, y: -170 },     // 3: top-right
    { x: 250, y: -200 },    // 4: far top-right
    { x: -300, y: -10 },    // 5: left side
    { x: -100, y: -40 },    // 6: center
    { x: 80, y: 10 },       // 7: center-right
    { x: 280, y: -30 },     // 8: right side
    { x: -250, y: 160 },    // 9: bottom-left
    { x: -50, y: 130 },     // 10: bottom-center
    { x: 120, y: 190 },     // 11: bottom-right
    { x: 300, y: 150 },     // 12: far bottom-right (destination)
  ];

  // Create nodes
  for (let i = 0; i < positions.length; i++) {
    const id = i + 1;
    nodes.push({
      id,
      x: positions[i].x,
      y: positions[i].y,
      r: NODE.RADIUS,
    });
    edges.set(id, []);
  }

  // Define edges with carefully chosen weights
  // Structure: [fromIdx, toIdx, weight]
  // Designed so greedy path (low local weights) != shortest path (low total weight)
  const edgeDefinitions: [number, number, number][] = [
    // From node 1 (start area)
    [0, 1, 4],    // 1->2: short direct
    [0, 4, 2],    // 1->5: low weight (tempting greedy choice)

    // From node 2
    [1, 2, 3],    // 2->3: continue right
    [1, 5, 5],    // 2->6: down to center

    // From node 3
    [2, 3, 8],    // 3->4: expensive rightward
    [2, 6, 4],    // 3->7: down

    // From node 4
    [3, 7, 3],    // 4->8: down-right

    // From node 5 (left path - appears cheap but costly overall)
    [4, 5, 7],    // 5->6: expensive connection
    [4, 8, 15],   // 5->9: very expensive (trap path)

    // From node 6 (center hub)
    [5, 6, 2],    // 6->7: cheap center route
    [5, 9, 6],    // 6->10: down

    // From node 7
    [6, 7, 3],    // 7->8: right
    [6, 10, 4],   // 7->11: down-right

    // From node 8 (right side)
    [7, 11, 5],   // 8->12: to destination

    // From node 9 (bottom left - dead end-ish)
    [8, 9, 12],   // 9->10: expensive

    // From node 10
    [9, 10, 3],   // 10->11: right

    // From node 11
    [10, 11, 2],  // 11->12: final stretch

    // Additional edges for more paths and connectivity
    [0, 5, 6],    // 1->6: diagonal shortcut
    [1, 6, 9],    // 2->7: expensive diagonal
    [2, 5, 3],    // 3->6: back connection
    [4, 9, 8],    // 5->10: down
    [6, 9, 5],    // 7->10: down
    [7, 10, 6],   // 8->11: diagonal
    [3, 11, 12],  // 4->12: long expensive skip
  ];

  // Create edges
  for (const [fromIdx, toIdx, weight] of edgeDefinitions) {
    addEdgeToMap(edges, nodes[fromIdx], nodes[toIdx], EDGE_TYPE.DIRECTED, weight);
  }

  return { nodes, edges, nodeCounter: nodes.length };
}
