import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useGraphStore } from "../../store/graphStore";
import { useShallow } from "zustand/shallow";
import { Node3D } from "./Node3D";
import { Edge3D } from "./Edge3D";

export function Graph3D() {
  const nodes = useGraphStore(useShallow((state) => state.data.nodes));
  const edges = useGraphStore((state) => state.data.edges);
  const visualizationInput = useGraphStore((state) => state.visualization.input);

  // Calculate graph center for camera positioning
  const { centerX, centerY } = useMemo(() => {
    if (nodes.length === 0) {
      return { centerX: 0, centerY: 0 };
    }
    const sumX = nodes.reduce((acc, node) => acc + node.x, 0);
    const sumY = nodes.reduce((acc, node) => acc + node.y, 0);
    return {
      centerX: sumX / nodes.length,
      centerY: -sumY / nodes.length,
    };
  }, [nodes]);

  // Calculate camera distance based on graph size
  const cameraDistance = useMemo(() => {
    if (nodes.length === 0) return 500;
    const xs = nodes.map((n) => n.x);
    const ys = nodes.map((n) => n.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    const maxDimension = Math.max(width, height, 200);
    return maxDimension * 1.5;
  }, [nodes]);

  // Flatten edges for rendering
  const edgeList = useMemo(() => {
    const list: Array<{
      fromId: number;
      toId: number;
      startPosition: [number, number, number];
      endPosition: [number, number, number];
      isDirected: boolean;
      weight: number;
    }> = [];

    const seenUndirected = new Set<string>();

    edges.forEach((nodeEdges, fromNodeId) => {
      const fromNode = nodes.find((n) => n.id === fromNodeId);
      if (!fromNode) return;

      nodeEdges.forEach((edge) => {
        const toNodeId = parseInt(edge.to);
        const toNode = nodes.find((n) => n.id === toNodeId);
        if (!toNode) return;

        const isDirected = edge.type === "directed";

        if (!isDirected) {
          const key = [Math.min(fromNodeId, toNodeId), Math.max(fromNodeId, toNodeId)].join("-");
          if (seenUndirected.has(key)) return;
          seenUndirected.add(key);
        }

        list.push({
          fromId: fromNodeId,
          toId: toNodeId,
          startPosition: [fromNode.x, -fromNode.y, 0],
          endPosition: [toNode.x, -toNode.y, 0],
          isDirected,
          weight: edge.weight,
        });
      });
    });

    return list;
  }, [edges, nodes]);

  const startNodeId = visualizationInput?.startNodeId ?? null;
  const endNodeId = visualizationInput?.endNodeId ?? null;

  return (
    <div className="w-full h-full bg-[var(--color-paper)]">
      <Canvas
        gl={{ antialias: true, alpha: true }}
        shadows
      >
        <PerspectiveCamera
          makeDefault
          position={[centerX, centerY, cameraDistance]}
          fov={45}
          near={1}
          far={5000}
        />
        <OrbitControls
          target={[centerX, centerY, 0]}
          enablePan
          enableZoom
          enableRotate
          minDistance={50}
          maxDistance={3000}
          dampingFactor={0.05}
          enableDamping
        />

        {/* Bright ambient light for overall illumination */}
        <ambientLight intensity={0.8} />

        {/* Main directional light */}
        <directionalLight
          position={[centerX + 200, centerY + 200, 300]}
          intensity={0.6}
        />

        {/* Fill light from opposite side */}
        <directionalLight
          position={[centerX - 150, centerY - 150, 200]}
          intensity={0.4}
        />

        {/* Render edges first (behind nodes) */}
        {edgeList.map((edge) => (
          <Edge3D
            key={`${edge.fromId}-${edge.toId}`}
            fromId={edge.fromId}
            toId={edge.toId}
            startPosition={edge.startPosition}
            endPosition={edge.endPosition}
            isDirected={edge.isDirected}
            weight={edge.weight}
          />
        ))}

        {/* Render nodes */}
        {nodes.map((node) => (
          <Node3D
            key={node.id}
            nodeId={node.id}
            position={[node.x, -node.y, 0]}
            startNodeId={startNodeId}
            endNodeId={endNodeId}
          />
        ))}
      </Canvas>
    </div>
  );
}
