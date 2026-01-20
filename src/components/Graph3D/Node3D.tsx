import { useRef, useMemo } from "react";
import { Sphere, Html } from "@react-three/drei";
import { useGraphStore } from "../../store/graphStore";
import { useSettingsStore } from "../../store/settingsStore";
import { NODE } from "../../utility/constants";
import * as THREE from "three";

interface Node3DProps {
  nodeId: number;
  position: [number, number, number];
  startNodeId: number | null;
  endNodeId: number | null;
}

// Read CSS variable value
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Create seamless diagonal lines texture (matching 2D pattern) using canvas
function createDiagonalTexture(size: number = 64, lineColor: string = '#000000', lineOpacity: number = 0.25): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Clear with transparent background
  ctx.clearRect(0, 0, size, size);

  // Set line style - matching 2D: single direction diagonal lines
  ctx.strokeStyle = lineColor;
  ctx.globalAlpha = lineOpacity;
  ctx.lineWidth = 1;

  // Spacing for the diagonal pattern
  const spacing = 6;

  // Draw diagonal lines from top-right to bottom-left (matching 2D pattern)
  // To make it seamless, we draw lines that wrap around
  ctx.beginPath();
  for (let i = 0; i < size * 2; i += spacing) {
    // Lines going from top-right to bottom-left
    ctx.moveTo(i, 0);
    ctx.lineTo(0, i);

    // Wrap-around lines to make seamless tiling
    ctx.moveTo(size, i);
    ctx.lineTo(i, size);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  return texture;
}

export function Node3D({ nodeId, position, startNodeId, endNodeId }: Node3DProps) {
  const groupRef = useRef<THREE.Group>(null);

  const nodeFlags = useGraphStore(
    (state) => state.visualization.trace.nodes.get(nodeId)
  );

  // Subscribe to theme to trigger re-render when it changes
  const theme = useSettingsStore((state) => state.theme);

  // Get theme-aware colors from CSS variables - recalculate when theme changes
  const colors = useMemo(() => {
    const getGradientColors = () => {
      if (nodeId === startNodeId) {
        return {
          start: getCSSVar('--gradient-start-start'),
          mid: getCSSVar('--gradient-start-mid'),
          end: getCSSVar('--gradient-start-end'),
        };
      }
      if (nodeId === endNodeId) {
        return {
          start: getCSSVar('--gradient-end-start'),
          mid: getCSSVar('--gradient-end-mid'),
          end: getCSSVar('--gradient-end-end'),
        };
      }
      if (nodeFlags?.isInShortestPath) {
        return {
          start: getCSSVar('--gradient-path-start'),
          mid: getCSSVar('--gradient-path-mid'),
          end: getCSSVar('--gradient-path-end'),
        };
      }
      if (nodeFlags?.isVisited) {
        return {
          start: getCSSVar('--gradient-visited-start'),
          mid: getCSSVar('--gradient-visited-mid'),
          end: getCSSVar('--gradient-visited-end'),
        };
      }
      return {
        start: getCSSVar('--gradient-default-start'),
        mid: getCSSVar('--gradient-default-mid'),
        end: getCSSVar('--gradient-default-end'),
      };
    };

    return {
      ...getGradientColors(),
      text: getCSSVar('--color-text'),
      nodeStroke: getCSSVar('--color-node-stroke'),
      paper: getCSSVar('--color-paper'),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeId, startNodeId, endNodeId, nodeFlags?.isInShortestPath, nodeFlags?.isVisited, theme]);

  // Create diagonal texture - recreate when text color changes (theme change)
  const diagonalTexture = useMemo(() => {
    return createDiagonalTexture(64, colors.text, 0.25);
  }, [colors.text]);

  return (
    <group position={position} ref={groupRef}>
      {/* Outer ring / stroke */}
      <mesh>
        <torusGeometry args={[NODE.RADIUS + 1.5, 2, 16, 48]} />
        <meshStandardMaterial
          color={colors.nodeStroke}
          roughness={0.5}
          metalness={0.2}
        />
      </mesh>

      {/* Main sphere with base color - using start color for brightness matching 2D */}
      <Sphere args={[NODE.RADIUS, 64, 64]}>
        <meshStandardMaterial
          color={colors.start}
          emissive={colors.mid}
          emissiveIntensity={0.3}
          roughness={0.5}
          metalness={0}
        />
      </Sphere>

      {/* Diagonal lines overlay sphere - slightly larger to prevent z-fighting */}
      <Sphere args={[NODE.RADIUS + 0.5, 64, 64]}>
        <meshBasicMaterial
          map={diagonalTexture}
          transparent
          opacity={1}
          depthWrite={false}
        />
      </Sphere>

      {/* Node label using Html for guaranteed visibility */}
      <Html
        center
        style={{
          color: colors.text,
          fontSize: '14px',
          fontWeight: 'bold',
          fontFamily: "'JetBrains Mono', monospace",
          textShadow: `0 0 4px ${colors.paper}, 0 0 8px ${colors.paper}`,
          pointerEvents: 'none',
          userSelect: 'none',
        }}
      >
        {nodeId}
      </Html>
    </group>
  );
}
