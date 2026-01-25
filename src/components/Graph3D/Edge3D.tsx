import { useMemo } from "react";
import { Line, Cone, Text, QuadraticBezierLine } from "@react-three/drei";
import { useGraphStore, selectEdgeVisState } from "../../store/graphStore";
import { useResolvedTheme, type ResolvedTheme } from "../../hooks/useResolvedTheme";
import { Vector3, Euler, Quaternion } from "three";
import { NODE, FONT_URL } from "../../utility/constants";
import { getEdgeColor, getEdgeArrowColor, getEdgeLineWidth, getUIColors } from "../../utility/cssVariables";

// Default edge colors by theme (distinct from node stroke colors)
const DEFAULT_EDGE_COLORS: Record<ResolvedTheme, string> = {
  light: '#706860',
  dark: '#686868',
  blueprint: '#a0d0f8',
};

interface Edge3DProps {
  fromId: number;
  toId: number;
  startPosition: [number, number, number];
  endPosition: [number, number, number];
  isDirected: boolean;
  weight?: number;
}

export function Edge3D({
  fromId,
  toId,
  startPosition,
  endPosition,
  isDirected,
  weight,
}: Edge3DProps) {
  // Get visualization state using derived selector
  const visState = useGraphStore(selectEdgeVisState(fromId, toId));

  // Get resolved theme with convenience booleans
  const { theme, isDark: isDarkTheme, isLight: isLightTheme, isBlueprint: isBlueprintTheme } = useResolvedTheme();

  // Get theme-aware edge colors - recalculate when theme or visState changes
  const colors = useMemo(() => {
    const edgeColor = visState === 'default'
      ? DEFAULT_EDGE_COLORS[theme]
      : getEdgeColor(visState);
    // Arrow color: lighter for default, darker for visualization states (to differentiate from edge)
    const arrowColor = getEdgeArrowColor(visState);
    return {
      edge: edgeColor,
      arrow: arrowColor,
      lineWidth: getEdgeLineWidth(visState),
    };

  }, [visState, theme]);

  // Get text and background colors for weight label - theme reactive
  const labelColors = useMemo(() => {
    const uiColors = getUIColors();
    return {
      text: uiColors.text,
      bg: uiColors.paper,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Theme-specific line width multiplier
  const lineWidthMultiplier = isDarkTheme ? 1.0 : isLightTheme ? 1.0 : 1.0; // Can adjust per theme
  const effectiveLineWidth = colors.lineWidth * lineWidthMultiplier;

  // Calculate curve control point and label position for edges
  const { controlPoint, labelPosition, arrowData, lineEndPosition } = useMemo(() => {
    const start = new Vector3(...startPosition);
    const end = new Vector3(...endPosition);
    const direction = new Vector3().subVectors(end, start);
    const length = direction.length();
    direction.normalize();

    // Calculate perpendicular offset for curve (only for directed edges)
    const curveOffset = isDirected ? length * 0.15 : 0;
    const perpendicular = new Vector3(-direction.y, direction.x, 0).normalize();

    // Straight midpoint between start and end
    const straightMid = new Vector3().addVectors(start, end).multiplyScalar(0.5);

    // Control point for Bezier curve (offset perpendicular to edge)
    const control = straightMid.clone().add(perpendicular.clone().multiplyScalar(curveOffset));

    // For Bezier curve, actual point at t=0.5 is:
    // B(0.5) = 0.25*start + 0.5*control + 0.25*end
    // This gives us the true visual center of the curved line
    const labelPos = isDirected
      ? new Vector3()
        .addScaledVector(start, 0.25)
        .addScaledVector(control, 0.5)
        .addScaledVector(end, 0.25)
      : straightMid;

    // Arrow data for directed edges
    let arrow = null;
    let lineEnd = endPosition;

    if (isDirected) {
      // For a quadratic Bezier curve, the tangent at t=1 is proportional to (end - control)
      // This gives us the actual direction the curve is traveling at the endpoint
      const tangentDirection = new Vector3().subVectors(end, control).normalize();

      // Position arrow near the end node, along the tangent direction
      const arrowPos = end.clone().sub(tangentDirection.clone().multiplyScalar(NODE.RADIUS + 6));

      // Calculate rotation for arrow cone using the tangent direction
      const up = new Vector3(0, 1, 0);
      const quaternion = new Quaternion().setFromUnitVectors(up, tangentDirection);
      const euler = new Euler().setFromQuaternion(quaternion);

      arrow = {
        position: arrowPos.toArray() as [number, number, number],
        rotation: [euler.x, euler.y, euler.z] as [number, number, number],
      };

      // Stop line before arrow, along the tangent direction
      const lineEndVec = end.clone().sub(tangentDirection.clone().multiplyScalar(NODE.RADIUS + 12));
      lineEnd = lineEndVec.toArray() as [number, number, number];
    }

    return {
      controlPoint: control.toArray() as [number, number, number],
      labelPosition: labelPos.toArray() as [number, number, number],
      arrowData: arrow,
      lineEndPosition: lineEnd,
    };
  }, [startPosition, endPosition, isDirected]);

  return (
    <group>
      {/* ===== DARK THEME EDGE ===== */}
      {isDarkTheme && (
        <>
          {isDirected ? (
            <QuadraticBezierLine
              start={startPosition}
              end={lineEndPosition}
              mid={controlPoint}
              color={colors.edge}
              lineWidth={effectiveLineWidth}
            />
          ) : (
            <Line
              points={[startPosition, endPosition]}
              color={colors.edge}
              lineWidth={effectiveLineWidth}
            />
          )}
        </>
      )}

      {/* ===== BLUEPRINT THEME EDGE ===== */}
      {isBlueprintTheme && (
        <>
          {isDirected ? (
            <QuadraticBezierLine
              start={startPosition}
              end={lineEndPosition}
              mid={controlPoint}
              color={colors.edge}
              lineWidth={effectiveLineWidth}
            />
          ) : (
            <Line
              points={[startPosition, endPosition]}
              color={colors.edge}
              lineWidth={effectiveLineWidth}
            />
          )}
        </>
      )}

      {/* ===== LIGHT THEME EDGE ===== */}
      {isLightTheme && (
        <>
          {isDirected ? (
            <QuadraticBezierLine
              start={startPosition}
              end={lineEndPosition}
              mid={controlPoint}
              color={colors.edge}
              lineWidth={effectiveLineWidth}
            />
          ) : (
            <Line
              points={[startPosition, endPosition]}
              color={colors.edge}
              lineWidth={effectiveLineWidth}
            />
          )}
        </>
      )}

      {/* Arrowhead for directed edges - lighter than edge color (matching 2D behavior) */}
      {isDirected && arrowData && (
        <group position={arrowData.position}>
          <Cone args={[5, 12, 8]} rotation={arrowData.rotation}>
            <meshBasicMaterial color={colors.arrow} />
          </Cone>
        </group>
      )}

      {/* Weight label - positioned at visual center of the edge */}
      {weight !== undefined && weight !== 0 && (
        <group position={labelPosition}>
          {/* Background plane - slightly behind text, toneMapped=false to match CSS colors */}
          <mesh position={[0, 0, 4]}>
            <planeGeometry args={[String(weight).length * 8 + 8, 16]} />
            <meshBasicMaterial color={labelColors.bg} toneMapped={false} />
          </mesh>
          <Text
            position={[0, 0, 5]}
            font={FONT_URL}
            fontSize={12}
            color={labelColors.text}
            anchorX="center"
            anchorY="middle"
          >
            {String(weight)}
          </Text>
        </group>
      )}
    </group>
  );
}
