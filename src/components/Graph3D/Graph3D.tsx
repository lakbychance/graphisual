import { useMemo, useRef, useEffect, useCallback, useState } from "react";
import { Canvas, useThree, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Grid } from "@react-three/drei";
import { useGraphStore } from "../../store/graphStore";
import { useShallow } from "zustand/shallow";
import { Node3D } from "./Node3D";
import { Edge3D } from "./Edge3D";
import { ZOOM } from "../../utility/constants";
import { useAlgorithmNodeClick } from "../../hooks/useAlgorithmNodeClick";
import { useVisualizationExecution } from "../../hooks/useVisualizationExecution";
import { useStepThroughVisualization } from "../../hooks/useStepThroughVisualization";
import { useElementDimensions } from "../../hooks/useElementDimensions";
import { useResolvedTheme, type ResolvedTheme } from "../../hooks/useResolvedTheme";

// Camera FOV in degrees
const CAMERA_FOV = 45;

// Calculate base camera distance from viewport height to match 2D view behavior
// Formula: visible_height = 2 * distance * tan(FOV/2)
// Therefore: distance = visible_height / (2 * tan(FOV/2))
const FOV_FACTOR = 2 * Math.tan((CAMERA_FOV * Math.PI / 180) / 2); // ≈ 0.8284 for 45°

function calculateBaseCameraDistance(viewportHeight: number): number {
  return viewportHeight / FOV_FACTOR;
}

// Get grid colors based on resolved theme
// Colors are muted (blended toward background) to appear semi-transparent
function getGridColors(theme: ResolvedTheme): { minor: string; major: string } {
  switch (theme) {
    case 'dark':
      return {
        minor: '#3a3a3a',  // Very muted gray on dark background
        major: '#454545',
      };
    case 'blueprint':
      return {
        minor: '#4a7a9e',  // Very muted blue lines
        major: '#5588aa',
      };
    case 'light':
    default:
      return {
        minor: '#c4c0ba',  // Very muted brown/gray on light background
        major: '#b0aca6',
      };
  }
}

// Intro animation settings
const INTRO_DURATION = 0.5; // seconds
const INTRO_TARGET_AZIMUTH = 0; // No horizontal rotation
const INTRO_TARGET_POLAR = Math.PI - Math.PI / 2.5; // Tilt from below (graph rotates toward user)

// Component to handle camera with bidirectional sync to 2D view
function CameraController({
  zoom,
  pan,
  baseCameraDistance,
  onZoomChange,
  onPanChange,
}: {
  zoom: number;
  pan: { x: number; y: number };
  baseCameraDistance: number;
  onZoomChange: (zoom: number) => void;
  onPanChange: (x: number, y: number) => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Track when we last updated the store from 3D to avoid sync-back within a window
  const lastStoreUpdateTime = useRef(0);
  // Track if we've done initial setup
  const hasInitialized = useRef(false);
  // Track if controls are ready (set via callback ref)
  const [controlsReady, setControlsReady] = useState(false);

  // Intro animation state
  const introProgress = useRef(0);
  const isIntroPlaying = useRef(true);

  // Callback ref to detect when OrbitControls is mounted
  const setControlsRef = useCallback((controls: any) => {
    controlsRef.current = controls;
    if (controls) {
      setControlsReady(true);
    }
  }, []);

  // Convert store values to 3D camera values
  const targetX = -pan.x;
  const targetY = pan.y;
  const cameraDistance = baseCameraDistance / zoom;

  // Sync from store to camera only when change is external (from 2D view)
  useEffect(() => {
    if (!controlsRef.current || !camera || !controlsReady) return;

    const controls = controlsRef.current;

    // Detect reset: zoom=1 and pan=(0,0) means user clicked reset
    const isReset = zoom === 1 && pan.x === 0 && pan.y === 0;

    // Skip sync if this change came from our own 3D update (within 100ms window)
    // But always allow reset
    const timeSinceLastUpdate = Date.now() - lastStoreUpdateTime.current;
    if (!isReset && timeSinceLastUpdate < 100) {
      return;
    }

    if (!hasInitialized.current || isReset) {
      // First mount or reset: position camera for front view (no rotation)
      controls.target.set(targetX, targetY, 0);
      camera.position.set(targetX, targetY, cameraDistance);
      camera.lookAt(targetX, targetY, 0);
      controls.update();
      hasInitialized.current = true;
    } else {
      // External change from 2D view: preserve rotation angles
      const currentAzimuth = controls.getAzimuthalAngle();
      const currentPolar = controls.getPolarAngle();

      // Set new target position
      controls.target.set(targetX, targetY, 0);

      // Calculate camera position preserving rotation angles
      const x = targetX + cameraDistance * Math.sin(currentPolar) * Math.sin(currentAzimuth);
      const y = targetY + cameraDistance * Math.cos(currentPolar);
      const z = cameraDistance * Math.sin(currentPolar) * Math.cos(currentAzimuth);

      camera.position.set(x, y, z);
      controls.update();
    }
  }, [camera, zoom, pan.x, pan.y, targetX, targetY, cameraDistance, controlsReady]);

  // Intro animation using useFrame
  useFrame((_, delta) => {
    if (!isIntroPlaying.current || !controlsRef.current || !camera) return;

    introProgress.current += delta;
    const t = Math.min(introProgress.current / INTRO_DURATION, 1);

    // Ease out cubic for smooth deceleration
    const eased = 1 - Math.pow(1 - t, 3);

    // Interpolate from front view (polar=PI/2, azimuth=0) to target angles
    const currentAzimuth = INTRO_TARGET_AZIMUTH * eased;
    const currentPolar = Math.PI / 2 + (INTRO_TARGET_POLAR - Math.PI / 2) * eased;

    // Calculate camera position from spherical coordinates
    const x = targetX + cameraDistance * Math.sin(currentPolar) * Math.sin(currentAzimuth);
    const y = targetY + cameraDistance * Math.cos(currentPolar);
    const z = cameraDistance * Math.sin(currentPolar) * Math.cos(currentAzimuth);

    camera.position.set(x, y, z);
    controlsRef.current.update();

    if (t >= 1) {
      isIntroPlaying.current = false;
    }
  });

  // Throttle ref for onChange updates
  const lastUpdateTime = useRef(0);
  const pendingUpdate = useRef<number | null>(null);

  // Handle OrbitControls changes with throttling for smooth sync
  const handleControlsChange = useCallback(() => {
    if (!controlsRef.current || !camera) return;

    const now = Date.now();
    const throttleMs = 50; // Update at most every 50ms

    const doUpdate = () => {
      if (!controlsRef.current || !camera) return;

      const target = controlsRef.current.target;
      const distance = camera.position.distanceTo(target);

      // Convert to store values
      const newZoom = Math.max(ZOOM.MIN, Math.min(ZOOM.MAX, baseCameraDistance / distance));
      const newPanX = -target.x;
      const newPanY = target.y;

      // Mark time so effect knows to skip sync-back
      lastStoreUpdateTime.current = Date.now();

      // Update store
      onZoomChange(newZoom);
      onPanChange(newPanX, newPanY);
      lastUpdateTime.current = Date.now();
    };

    // Clear any pending update
    if (pendingUpdate.current) {
      cancelAnimationFrame(pendingUpdate.current);
      pendingUpdate.current = null;
    }

    if (now - lastUpdateTime.current >= throttleMs) {
      // Enough time has passed, update immediately
      doUpdate();
    } else {
      // Schedule update for next frame
      pendingUpdate.current = requestAnimationFrame(doUpdate);
    }
  }, [camera, onZoomChange, onPanChange, baseCameraDistance]);

  // Min/max distance based on zoom limits
  const minDistance = baseCameraDistance / ZOOM.MAX;
  const maxDistance = baseCameraDistance / ZOOM.MIN;

  return (
    <OrbitControls
      ref={setControlsRef}
      onChange={handleControlsChange}
      enablePan={true}
      enableZoom
      enableRotate
      minDistance={minDistance}
      maxDistance={maxDistance}
      dampingFactor={0.05}
      enableDamping
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI * 5 / 6}
      minAzimuthAngle={-Math.PI / 3}
      maxAzimuthAngle={Math.PI / 3}
    />
  );
}

export function Graph3D() {
  const nodes = useGraphStore(useShallow((state) => state.data.nodes));
  const edges = useGraphStore((state) => state.data.edges);
  const { theme } = useResolvedTheme();

  // Track container dimensions for responsive camera distance
  const containerRef = useRef<HTMLDivElement>(null);
  const containerDimensions = useElementDimensions(containerRef);

  // Calculate base camera distance from viewport height to match 2D view
  const baseCameraDistance = useMemo(() => {
    if (containerDimensions.height === 0) return 1000; // Fallback
    return calculateBaseCameraDistance(containerDimensions.height);
  }, [containerDimensions.height]);

  // Shared algorithm node click handler
  const { handleNodeClick } = useAlgorithmNodeClick();

  // Visualization execution hook - only need currentAlgorithm and isVisualizing for isClickable check
  const { currentAlgorithm, isVisualizing, visualizationInput } = useVisualizationExecution();

  // Apply step-through visualization when stepIndex changes
  useStepThroughVisualization();

  // Viewport state from store (shared with 2D view)
  const zoom = useGraphStore((state) => state.viewport.zoom);
  const pan = useGraphStore((state) => state.viewport.pan);
  const setViewportZoom = useGraphStore((state) => state.setViewportZoom);
  const setViewportPan = useGraphStore((state) => state.setViewportPan);

  // Callbacks for CameraController
  const handleZoomChange = useCallback((newZoom: number) => {
    setViewportZoom(newZoom);
  }, [setViewportZoom]);

  const handlePanChange = useCallback((x: number, y: number) => {
    setViewportPan(x, y);
  }, [setViewportPan]);

  // Don't render Canvas until dimensions are ready to prevent WebGL context issues
  const isReady = containerDimensions.height > 0;

  // Get theme-aware grid colors
  const gridColors = useMemo(() => {
    return getGridColors(theme);
  }, [theme]);

  // Fixed large grid size - doesn't change to avoid flickering
  const gridSize = 10000;

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
    <div
      ref={containerRef}
      className="w-full h-full bg-[var(--color-paper)]"
    >
      {isReady && (
        <Canvas
          gl={{ antialias: true, alpha: true }}
          shadows
        >
        <PerspectiveCamera
          makeDefault
          position={[0, 0, baseCameraDistance]}
          fov={CAMERA_FOV}
          near={1}
          far={baseCameraDistance * 10}
        />
        <CameraController
          zoom={zoom}
          pan={pan}
          baseCameraDistance={baseCameraDistance}
          onZoomChange={handleZoomChange}
          onPanChange={handlePanChange}
        />

        {/* Bright ambient light for overall illumination */}
        <ambientLight intensity={0.8} />


        {/* Grid - fixed at origin (large enough to cover any view) */}
        <Grid
          key={`grid-${theme}`}
          position={[0, 0, -5]}
          rotation={[Math.PI / 2, 0, 0]}
          args={[gridSize, gridSize]}
          cellSize={24}
          cellThickness={0.8}
          cellColor={gridColors.minor}
          sectionSize={120}
          sectionThickness={1}
          sectionColor={gridColors.major}
          fadeDistance={gridSize * 0.4}
          fadeStrength={2}
          fadeFrom={1}
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
            onClick={handleNodeClick}
            isClickable={!!currentAlgorithm && !isVisualizing}
          />
        ))}
        </Canvas>
      )}
    </div>
  );
}
