import { useMemo, useState, useCallback } from "react";
import { Sphere, Text } from "@react-three/drei";
import { useGraphStore, selectNodeVisState } from "../../store/graphStore";
import { useResolvedTheme, type ResolvedTheme } from "../../hooks/useResolvedTheme";
import { NODE } from "../../utility/constants";
import { getNodeGradientColors, getNodeStrokeColor, getUIColors } from "../../utility/cssVariables";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";

// Default node stroke colors by theme (distinct from edge colors)
const DEFAULT_STROKE_COLORS: Record<ResolvedTheme, string> = {
  light: '#a8a29a',
  dark: '#787878',
  blueprint: '#60a0e8',
};

interface Node3DProps {
  nodeId: number;
  position: [number, number, number];
  startNodeId: number | null;
  endNodeId: number | null;
  onClick?: (nodeId: number) => void;
  isClickable?: boolean;
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

export function Node3D({ nodeId, position, startNodeId, endNodeId, onClick, isClickable = false }: Node3DProps) {
  // Get visualization state using derived selector
  const visState = useGraphStore(selectNodeVisState(nodeId, startNodeId, endNodeId));

  // Get resolved theme with convenience booleans
  const { theme, isDark: isDarkTheme, isLight: isLightTheme, isBlueprint: isBlueprintTheme } = useResolvedTheme();

  // Get theme-aware colors from CSS variables - recalculate when theme changes
  const colors = useMemo(() => {
    const gradientColors = getNodeGradientColors(visState);
    const uiColors = getUIColors();
    const strokeColor = getNodeStrokeColor(visState);
    return {
      ...gradientColors,
      ...uiColors,
      stroke: strokeColor,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visState, theme]);

  // Create diagonal texture - recreate when text color changes (theme change)
  const diagonalTexture = useMemo(() => {
    return createDiagonalTexture(64, colors.text, 0.25);
  }, [colors.text]);

  // Hover state for visual feedback
  const [isHovered, setIsHovered] = useState(false);

  // Click handler
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (isClickable && onClick) {
      onClick(nodeId);
    }
  }, [isClickable, onClick, nodeId]);

  // Pointer handlers for hover effect
  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    if (isClickable) {
      setIsHovered(true);
      document.body.style.cursor = 'pointer';
    }
  }, [isClickable]);

  const handlePointerOut = useCallback(() => {
    setIsHovered(false);
    document.body.style.cursor = 'auto';
  }, []);

  // Enhanced glow when hovered and clickable
  const hoverScale = isHovered && isClickable ? 1.1 : 1;
  const hoverEmissiveBoost = isHovered && isClickable ? 0.3 : 0;

  return (
    <group
      position={position}
      scale={hoverScale}
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      {/* ===== DARK THEME: Subtle glow layers (at node edge) ===== */}
      {isDarkTheme && (
        <>
          <Sphere args={[NODE.RADIUS * 1.08, 32, 32]}>
            <meshBasicMaterial
              color={colors.mid}
              transparent
              opacity={0.12 + hoverEmissiveBoost}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </Sphere>
          <Sphere args={[NODE.RADIUS * 1.02, 32, 32]}>
            <meshBasicMaterial
              color={colors.start}
              transparent
              opacity={0.2 + hoverEmissiveBoost}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </Sphere>
        </>
      )}

      {/* ===== BLUEPRINT THEME: Subtle glow layers (at node edge) ===== */}
      {isBlueprintTheme && (
        <>
          <Sphere args={[NODE.RADIUS * 1.08, 32, 32]}>
            <meshBasicMaterial
              color={colors.mid}
              transparent
              opacity={0.12 + hoverEmissiveBoost}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </Sphere>
          <Sphere args={[NODE.RADIUS * 1.02, 32, 32]}>
            <meshBasicMaterial
              color={colors.start}
              transparent
              opacity={0.2 + hoverEmissiveBoost}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </Sphere>
        </>
      )}

      {/* Outer ring / stroke - uses state-aware color like 2D */}
      <mesh>
        <torusGeometry args={[NODE.RADIUS + 1.5, 2, 16, 48]} />
        <meshBasicMaterial
          color={visState === 'default' ? DEFAULT_STROKE_COLORS[theme] : colors.stroke}
        />
      </mesh>

      {/* Main sphere - theme-specific settings */}
      <Sphere args={[NODE.RADIUS, 64, 64]}>
        {isDarkTheme && (
          <meshStandardMaterial
            color={colors.start}
            emissive={colors.mid}
            emissiveIntensity={0.2 + hoverEmissiveBoost}
            roughness={0.4}
            metalness={0.3}
          />
        )}
        {isBlueprintTheme && (
          <meshStandardMaterial
            color={colors.start}
            emissive={colors.mid}
            emissiveIntensity={0.2 + hoverEmissiveBoost}
            roughness={0.4}
            metalness={0.3}
          />
        )}
        {/* LIGHT THEME: Warm cream for default, mid color for colored states */}
        {isLightTheme && (
          <meshBasicMaterial color={visState === 'default' ? '#ffefcc' : colors.mid} />
        )}
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

      {/* Node label using Text for 3D scaling */}
      <Text
        position={[0, 0, NODE.RADIUS + 1]}
        fontSize={14}
        color={colors.text}
        anchorX="center"
        anchorY="middle"
        fontWeight="bold"
        outlineWidth={2}
        outlineColor={colors.paper}
      >
        {String(nodeId)}
      </Text>
    </group>
  );
}
