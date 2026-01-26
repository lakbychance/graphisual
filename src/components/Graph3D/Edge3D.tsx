import { useMemo, useEffect } from "react";
import { Cone, Text } from "@react-three/drei";
import { useGraphStore, selectEdgeVisState } from "../../store/graphStore";
import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import { Vector3, Euler, Quaternion, QuadraticBezierCurve3, TubeGeometry, LineCurve3 } from "three";
import { NODE, FONT_URL } from "../../utility/constants";
import { getEdgeColor, getEdgeArrowColor, getEdgeLineWidth, getUIColors } from "../../utility/cssVariables";
import { EDGE_COLORS, EDGE_EMISSIVE_OFF } from "./theme3D";
import { useIntroAnimation } from "./introAnimation";

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
  // Intro animation - only using opacity for fade effect
  const { opacity: introOpacity } = useIntroAnimation();

  // Get visualization state using derived selector
  const visState = useGraphStore(selectEdgeVisState(fromId, toId));

  // Get resolved theme
  const { theme } = useResolvedTheme();

  // Get theme-aware edge colors - recalculate when theme or visState changes
  const colors = useMemo(() => {
    const edgeColor = visState === 'default'
      ? EDGE_COLORS[theme]
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

  const effectiveLineWidth = colors.lineWidth;

  // Calculate curve control point and label position for edges
  const { labelPosition, arrowData, curve } = useMemo(() => {
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

    // Arrow data and line end for directed edges
    let arrow = null;
    let lineEndVec = end;

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

      // Stop tube before arrow, along the tangent direction
      lineEndVec = end.clone().sub(tangentDirection.clone().multiplyScalar(NODE.RADIUS + 12));
    }

    // Calculate label position based on the VISIBLE curve
    // For Bezier curve at t=0.5: B(0.5) = 0.25*P0 + 0.5*P1 + 0.25*P2
    // For directed edges, use the shortened endpoint (lineEndVec) with the original control point
    const labelPos = isDirected
      ? new Vector3()
        .addScaledVector(start, 0.25)
        .addScaledVector(control, 0.5)
        .addScaledVector(lineEndVec, 0.25)
      : straightMid;

    // Create curve for tube geometry
    const curve = isDirected
      ? new QuadraticBezierCurve3(start, control, lineEndVec)
      : new LineCurve3(start, end);

    return {
      labelPosition: labelPos.toArray() as [number, number, number],
      arrowData: arrow,
      curve,
    };
  }, [startPosition, endPosition, isDirected]);

  // Create tube geometry from curve
  const tubeRadius = effectiveLineWidth * 0.4;
  const tubeGeometry = useMemo(() => {
    const segments = isDirected ? 32 : 16;
    return new TubeGeometry(curve, segments, tubeRadius, 8, false);
  }, [curve, tubeRadius, isDirected]);

  // Dispose geometry on unmount
  useEffect(() => {
    return () => {
      tubeGeometry.dispose();
    };
  }, [tubeGeometry]);

  return (
    <group>
      {/* Edge tube - 3D cylindrical edge */}
      <mesh geometry={tubeGeometry}>
        <meshPhysicalMaterial
          color={colors.edge}
          emissive={theme === 'light' && visState !== 'default' ? colors.edge : EDGE_EMISSIVE_OFF}
          emissiveIntensity={theme === 'light' && visState !== 'default' ? 0.25 : 0}
          roughness={theme === 'blueprint' ? 0.5 : 0.35}
          metalness={theme === 'blueprint' ? 0.1 : 0.2}
          clearcoat={theme === 'blueprint' ? 0.3 : 0.4}
          clearcoatRoughness={theme === 'blueprint' ? 0.5 : 0.4}
          transparent
          opacity={introOpacity}
        />
      </mesh>

      {/* Arrowhead for directed edges - polished material */}
      {isDirected && arrowData && (
        <group position={arrowData.position}>
          <Cone args={[5, 12, 12]} rotation={arrowData.rotation}>
            <meshPhysicalMaterial
              color={colors.arrow}
              roughness={0.25}
              metalness={0.4}
              clearcoat={0.6}
              clearcoatRoughness={0.3}
              transparent
              opacity={introOpacity}
            />
          </Cone>
        </group>
      )}

      {/* Weight label - positioned at visual center of the edge */}
      {weight !== undefined && weight !== 0 && (
        <group position={labelPosition}>
          {/* Background plane - slightly behind text, toneMapped=false to match CSS colors */}
          <mesh position={[0, 0, 4]}>
            <planeGeometry args={[String(weight).length * 8 + 8, 16]} />
            <meshBasicMaterial color={labelColors.bg} toneMapped={false} transparent opacity={introOpacity} />
          </mesh>
          <Text
            position={[0, 0, 5]}
            font={FONT_URL}
            fontSize={12}
            color={labelColors.text}
            anchorX="center"
            anchorY="middle"
            fillOpacity={introOpacity}
          >
            {String(weight)}
          </Text>
        </group>
      )}
    </group>
  );
}
