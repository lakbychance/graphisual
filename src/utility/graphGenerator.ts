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

// Canvas dimensions for layout (will be centered)
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDING = 100;

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
 * Layout nodes randomly scattered
 */
function randomLayout(count: number, width: number, height: number, padding: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const minDistance = 60; // Minimum distance between nodes to avoid overlap

  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x: number, y: number;

    do {
      x = padding + Math.random() * (width - 2 * padding);
      y = padding + Math.random() * (height - 2 * padding);
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
 * Layout nodes in a grid pattern
 */
function gridLayout(count: number, width: number, height: number, padding: number): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];

  // Calculate optimal grid dimensions
  const aspectRatio = (width - 2 * padding) / (height - 2 * padding);
  let cols = Math.ceil(Math.sqrt(count * aspectRatio));
  let rows = Math.ceil(count / cols);

  // Adjust if we have too many cells
  while (cols * rows < count) {
    cols++;
  }

  const cellWidth = (width - 2 * padding) / (cols - 1 || 1);
  const cellHeight = (height - 2 * padding) / (rows - 1 || 1);

  let nodeIdx = 0;
  for (let row = 0; row < rows && nodeIdx < count; row++) {
    for (let col = 0; col < cols && nodeIdx < count; col++) {
      positions.push({
        x: padding + col * cellWidth,
        y: padding + row * cellHeight,
      });
      nodeIdx++;
    }
  }

  return positions;
}

/**
 * Generate a random graph
 */
export function generateRandomGraph(options: RandomGeneratorOptions): GeneratedGraph {
  const { nodeCount, edgeDensity, directed, weighted, minWeight = 1, maxWeight = 10, layout = "circular" } = options;

  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  // Get positions based on layout type
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - PADDING;

  let positions: { x: number; y: number }[];
  switch (layout) {
    case "random":
      positions = randomLayout(nodeCount, CANVAS_WIDTH, CANVAS_HEIGHT, PADDING);
      break;
    case "grid":
      positions = gridLayout(nodeCount, CANVAS_WIDTH, CANVAS_HEIGHT, PADDING);
      break;
    case "circular":
    default:
      positions = circularLayout(nodeCount, centerX, centerY, radius);
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
 * Generate a path graph (linear chain)
 */
export function generatePath(nodeCount: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const startX = PADDING;
  const endX = CANVAS_WIDTH - PADDING;
  const y = CANVAS_HEIGHT / 2;
  const spacing = (endX - startX) / (nodeCount - 1 || 1);

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: i + 1,
      x: startX + i * spacing,
      y,
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
 * Generate a cycle graph
 */
export function generateCycle(nodeCount: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - PADDING;
  const positions = circularLayout(nodeCount, centerX, centerY, radius);

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
 * Generate a complete graph (K_n)
 */
export function generateComplete(nodeCount: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - PADDING;
  const positions = circularLayout(nodeCount, centerX, centerY, radius);

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
 * Generate a star graph
 */
export function generateStar(nodeCount: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;

  // Center node
  nodes.push({
    id: 1,
    x: centerX,
    y: centerY,
    r: NODE.RADIUS,
  });
  edges.set(1, []);

  // Outer nodes
  const radius = Math.min(CANVAS_WIDTH, CANVAS_HEIGHT) / 2 - PADDING;
  const outerCount = nodeCount - 1;
  const positions = circularLayout(outerCount, centerX, centerY, radius);

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
 * Generate a binary tree
 */
export function generateBinaryTree(depth: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const nodeCount = Math.pow(2, depth) - 1;
  const levelHeight = (CANVAS_HEIGHT - 2 * PADDING) / (depth - 1 || 1);

  let nodeId = 1;

  // Create nodes level by level
  for (let level = 0; level < depth; level++) {
    const nodesInLevel = Math.pow(2, level);
    const levelWidth = CANVAS_WIDTH - 2 * PADDING;
    const spacing = levelWidth / (nodesInLevel + 1);

    for (let i = 0; i < nodesInLevel; i++) {
      if (nodeId > nodeCount) break;

      nodes.push({
        id: nodeId,
        x: PADDING + spacing * (i + 1),
        y: PADDING + level * levelHeight,
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
 * Generate a DAG (Directed Acyclic Graph)
 * Creates a layered structure where edges only go from earlier to later layers
 */
export function generateDAG(layers: number, nodesPerLayer: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const layerHeight = (CANVAS_HEIGHT - 2 * PADDING) / (layers - 1 || 1);

  // Create nodes layer by layer
  let nodeId = 1;
  const layerNodes: INode[][] = [];

  for (let layer = 0; layer < layers; layer++) {
    const layerWidth = CANVAS_WIDTH - 2 * PADDING;
    const spacing = layerWidth / (nodesPerLayer + 1);
    const currentLayerNodes: INode[] = [];

    for (let i = 0; i < nodesPerLayer; i++) {
      const node: INode = {
        id: nodeId,
        x: PADDING + spacing * (i + 1),
        y: PADDING + layer * layerHeight,
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
 * Generate a grid graph
 */
export function generateGrid(rows: number, cols: number): GeneratedGraph {
  const nodes: INode[] = [];
  const edges = new Map<number, IEdge[]>();

  const cellWidth = (CANVAS_WIDTH - 2 * PADDING) / (cols - 1 || 1);
  const cellHeight = (CANVAS_HEIGHT - 2 * PADDING) / (rows - 1 || 1);

  // Create nodes
  let nodeId = 1;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      nodes.push({
        id: nodeId,
        x: PADDING + col * cellWidth,
        y: PADDING + row * cellHeight,
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
