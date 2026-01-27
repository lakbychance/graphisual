import { useMemo, useState, useCallback } from "react";
import { Text } from "@react-three/drei";
import { useGraphStore, selectNodeVisState } from "../../store/graphStore";
import { useResolvedTheme } from "../../hooks/useResolvedTheme";
import { NODE } from "../../constants/graph";
import { FONT_URL } from "../../constants/ui";
import { getNodeGradientColors, getUIColors } from "../../utility/cssVariables";
import * as THREE from "three";
import { ThreeEvent } from "@react-three/fiber";
import { NODE_STROKE_COLORS, NODE_LIGHT_THEME, NODE_GEOMETRY } from "./theme3D";
import { introClippingPlanes } from "./introAnimation";

// Shared geometries - created once and reused across all nodes
let sharedGeometries: {
  mainSphere: THREE.SphereGeometry;
  glowOuter: THREE.SphereGeometry;
  glowInner: THREE.SphereGeometry;
  overlaySphere: THREE.SphereGeometry;
  torusRing: THREE.TorusGeometry;
} | null = null;

function getSharedGeometries() {
  if (!sharedGeometries) {
    const { sphereSegments, glowOuterScale, glowInnerScale, overlayOffset, torusRadiusOffset, torusTubeRadius, torusRadialSegments, torusTubularSegments } = NODE_GEOMETRY;
    sharedGeometries = {
      mainSphere: new THREE.SphereGeometry(NODE.RADIUS, sphereSegments, sphereSegments),
      glowOuter: new THREE.SphereGeometry(NODE.RADIUS * glowOuterScale, sphereSegments, sphereSegments),
      glowInner: new THREE.SphereGeometry(NODE.RADIUS * glowInnerScale, sphereSegments, sphereSegments),
      overlaySphere: new THREE.SphereGeometry(NODE.RADIUS + overlayOffset, sphereSegments, sphereSegments),
      torusRing: new THREE.TorusGeometry(NODE.RADIUS + torusRadiusOffset, torusTubeRadius, torusRadialSegments, torusTubularSegments),
    };
  }
  return sharedGeometries;
}

interface Node3DProps {
  nodeId: number;
  position: [number, number, number];
  startNodeId: number | null;
  endNodeId: number | null;
  onClick?: (nodeId: number) => void;
  isClickable?: boolean;
  introOpacity: number;
  introZOffset: number;
}

// Shared diagonal texture cache - keyed by color to support theme changes
const diagonalTextureCache = new Map<string, THREE.CanvasTexture>();

// Get or create diagonal texture (shared across all nodes with same color)
function getDiagonalTexture(lineColor: string, lineOpacity: number = 0.25): THREE.CanvasTexture {
  const cacheKey = `${lineColor}-${lineOpacity}`;

  if (diagonalTextureCache.has(cacheKey)) {
    return diagonalTextureCache.get(cacheKey)!;
  }

  const size = 64;
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
  ctx.beginPath();
  for (let i = 0; i < size * 2; i += spacing) {
    ctx.moveTo(i, 0);
    ctx.lineTo(0, i);
    ctx.moveTo(size, i);
    ctx.lineTo(i, size);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);

  diagonalTextureCache.set(cacheKey, texture);
  return texture;
}

export function Node3D({ nodeId, position, startNodeId, endNodeId, onClick, isClickable = false, introOpacity, introZOffset }: Node3DProps) {

  // Get visualization state using derived selector
  const visState = useGraphStore(selectNodeVisState(nodeId, startNodeId, endNodeId));

  // Get resolved theme with convenience booleans
  const { theme, isDark: isDarkTheme, isLight: isLightTheme, isBlueprint: isBlueprintTheme } = useResolvedTheme();

  // Get theme-aware colors from CSS variables - recalculate when theme changes
  const colors = useMemo(() => {
    const gradientColors = getNodeGradientColors(visState);
    const uiColors = getUIColors();
    return {
      ...gradientColors,
      ...uiColors,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visState, theme]);

  // Get shared diagonal texture (cached by color)
  const diagonalTexture = useMemo(() => {
    return getDiagonalTexture(colors.text, 0.25);
  }, [colors.text]);
  // Note: No disposal needed - texture is shared and cached

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

  // Get shared geometries (created once, reused across all nodes)
  const geometries = getSharedGeometries();

  // Torus color - use gradient mid color for visualization states (solid hex, no alpha)
  // The --color-tint-* variables have rgba with alpha which Three.js doesn't handle well
  const torusColor = visState === 'default' ? NODE_STROKE_COLORS[theme] : colors.mid;

  return (
    <group position={[0, 0, introZOffset]}>
      <group
          position={position}
          scale={hoverScale}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
        {/* Glow layers for dark theme */}
        {isDarkTheme && (
          <>
            <mesh geometry={geometries.glowOuter}>
              <meshBasicMaterial
                color={colors.mid}
                transparent
                opacity={0.08 + hoverEmissiveBoost * 0.5}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                clippingPlanes={introClippingPlanes}
              />
            </mesh>
            <mesh geometry={geometries.glowInner}>
              <meshBasicMaterial
                color={colors.start}
                transparent
                opacity={0.15 + hoverEmissiveBoost * 0.5}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                clippingPlanes={introClippingPlanes}
              />
            </mesh>
          </>
        )}

        {/* Outer ring / stroke - polished metallic look */}
        <mesh geometry={geometries.torusRing}>
          <meshPhysicalMaterial
            color={torusColor}
            roughness={0.3}
            metalness={0.6}
            clearcoat={0.5}
            clearcoatRoughness={0.3}
            transparent
            opacity={introOpacity}
          />
        </mesh>

        {/* Main sphere - polished physical material */}
        <mesh geometry={geometries.mainSphere}>
          {isDarkTheme && (
            <meshPhysicalMaterial
              color={colors.start}
              emissive={colors.mid}
              emissiveIntensity={0.3 + hoverEmissiveBoost}
              roughness={0.15}
              metalness={0.1}
              clearcoat={0.8}
              clearcoatRoughness={0.2}
              envMapIntensity={0.5}
              clippingPlanes={introClippingPlanes}
            />
          )}
          {isBlueprintTheme && (
            <meshPhysicalMaterial
              color={colors.start}
              emissive={colors.mid}
              emissiveIntensity={0.15 + hoverEmissiveBoost}
              roughness={0.3}
              metalness={0.05}
              clearcoat={0.6}
              clearcoatRoughness={0.3}
              envMapIntensity={0.3}
              clippingPlanes={introClippingPlanes}
            />
          )}
          {isLightTheme && (
            <meshPhysicalMaterial
              color={visState === 'default' ? NODE_LIGHT_THEME.defaultColor : colors.mid}
              emissive={visState === 'default' ? NODE_LIGHT_THEME.defaultEmissive : colors.start}
              emissiveIntensity={visState === 'default' ? 0.05 : 0.18 + hoverEmissiveBoost}
              roughness={0.2}
              metalness={0.05}
              clearcoat={1.0}
              clearcoatRoughness={0.1}
              envMapIntensity={0.4}
              clippingPlanes={introClippingPlanes}
            />
          )}
        </mesh>

        {/* Diagonal lines overlay sphere - slightly larger to prevent z-fighting */}
        <mesh geometry={geometries.overlaySphere}>
          <meshBasicMaterial
            map={diagonalTexture}
            transparent
            opacity={1}
            depthWrite={false}
            clippingPlanes={introClippingPlanes}
          />
        </mesh>

        {/* Node label using Text for 3D scaling */}
        <Text
          position={[0, 0, NODE.RADIUS + 1]}
          font={FONT_URL}
          fontSize={14}
          color={colors.text}
          anchorX="center"
          anchorY="middle"
          fillOpacity={introOpacity}
        >
          {String(nodeId)}
        </Text>
      </group>
    </group>
  );
}
