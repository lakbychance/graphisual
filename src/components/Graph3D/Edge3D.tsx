import { useMemo } from "react";
import { Line, Cone, Html, QuadraticBezierLine } from "@react-three/drei";
import { useGraphStore } from "../../store/graphStore";
import { useSettingsStore } from "../../store/settingsStore";
import { Vector3, Euler, Quaternion } from "three";
import { NODE } from "../../utility/constants";

interface Edge3DProps {
  fromId: number;
  toId: number;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  isDirected: boolean;
  weight?: number;
}

// Read CSS variable value
function getCSSVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function Edge3D({
  fromId,
  toId,
  startPosition,
  endPosition,
  isDirected,
  weight,
}: Edge3DProps) {
  const edgeFlags = useGraphStore(
    (state) => state.visualization.trace.edges.get(`${fromId}-${toId}`)
  );

  // Subscribe to theme to trigger re-render when it changes
  const theme = useSettingsStore((state) => state.theme);

  // Get theme-aware edge colors - recalculate when theme changes
  // Note: Using node-stroke for default edges since edge-default uses rgba which doesn't work well in 3D
  const colors = useMemo(() => {
    if (edgeFlags?.isUsedInShortestPath) {
      return {
        edge: getCSSVar('--color-edge-path'),
        lineWidth: 3.5,
      };
    }
    if (edgeFlags?.isUsedInTraversal) {
      return {
        edge: getCSSVar('--color-edge-traversal'),
        lineWidth: 3,
      };
    }
    // Use node-stroke color for default edges - it's a solid color that matches the theme
    return {
      edge: getCSSVar('--color-node-stroke'),
      lineWidth: 2.5,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeFlags?.isUsedInShortestPath, edgeFlags?.isUsedInTraversal, theme]);

  // Get text and background colors for weight label - theme reactive
  const labelColors = useMemo(() => ({
    text: getCSSVar('--color-text'),
    bg: getCSSVar('--color-paper'),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [theme]);

  // Calculate midpoint with curve offset for directed edges
  const { midPoint, arrowData, lineEndPosition } = useMemo(() => {
    const start = new Vector3(...startPosition);
    const end = new Vector3(...endPosition);
    const direction = new Vector3().subVectors(end, start);
    const length = direction.length();
    direction.normalize();

    // Calculate perpendicular offset for curve (only for directed edges)
    const curveOffset = isDirected ? length * 0.15 : 0;
    const perpendicular = new Vector3(-direction.y, direction.x, 0).normalize();

    // Midpoint with curve - this is the actual 3D position on the curve
    const mid = new Vector3()
      .addVectors(start, end)
      .multiplyScalar(0.5)
      .add(perpendicular.clone().multiplyScalar(curveOffset));

    // Arrow data for directed edges
    let arrow = null;
    let lineEnd = endPosition;

    if (isDirected) {
      // Position arrow near the end node
      const arrowPos = end.clone().sub(direction.clone().multiplyScalar(NODE.RADIUS + 6));

      // Calculate rotation for arrow cone
      const up = new Vector3(0, 1, 0);
      const quaternion = new Quaternion().setFromUnitVectors(up, direction);
      const euler = new Euler().setFromQuaternion(quaternion);

      arrow = {
        position: arrowPos.toArray() as [number, number, number],
        rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      };

      // Stop line before arrow
      const lineEndVec = end.clone().sub(direction.clone().multiplyScalar(NODE.RADIUS + 12));
      lineEnd = lineEndVec.toArray() as [number, number, number];
    }

    return {
      midPoint: mid.toArray() as [number, number, number],
      arrowData: arrow,
      lineEndPosition: lineEnd,
    };
  }, [startPosition, endPosition, isDirected]);

  return (
    <group>
      {/* Edge - curved for directed, straight for undirected */}
      {isDirected ? (
        <QuadraticBezierLine
          start={startPosition}
          end={lineEndPosition}
          mid={midPoint}
          color={colors.edge}
          lineWidth={colors.lineWidth}
        />
      ) : (
        <Line
          points={[startPosition, endPosition]}
          color={colors.edge}
          lineWidth={colors.lineWidth}
        />
      )}

      {/* Arrowhead for directed edges - using meshBasicMaterial for consistent brightness */}
      {isDirected && arrowData && (
        <group position={arrowData.position}>
          <Cone
            args={[5, 12, 8]}
            rotation={arrowData.rotation}
          >
            <meshBasicMaterial color={colors.edge} />
          </Cone>
        </group>
      )}

      {/* Weight label - positioned at 3D midpoint of the edge */}
      {weight !== undefined && weight !== 0 && (
        <group position={midPoint}>
          <Html
            center
            style={{
              backgroundColor: labelColors.bg,
              color: labelColors.text,
              fontSize: '12px',
              fontWeight: 'bold',
              fontFamily: "'JetBrains Mono', monospace",
              padding: '2px 6px',
              borderRadius: '4px',
              pointerEvents: 'none',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {weight}
          </Html>
        </group>
      )}
    </group>
  );
}
