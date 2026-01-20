import { useState, useRef, useEffect, useCallback, lazy, Suspense } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { Graph, GraphHandle } from "../Graph/Graph";
import type { Graph3DHandle } from "../Graph3D";
// Lazy load Graph3D (and Three.js) - only downloaded when user toggles 3D mode on desktop
const Graph3D = lazy(() =>
  import("../Graph3D").then((mod) => ({ default: mod.Graph3D }))
);
import { cn } from "@/lib/utils";
import { algorithmRegistry } from "../../algorithms";
import { AlgorithmPicker } from "../ui/algorithm-picker";
import { GraphGenerator } from "../ui/graph-generator";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { RotateCcw, Undo2, Redo2, Trash2, Download, FileCode, Image, Box } from "lucide-react";
import { useGraphStore, selectStepIndex, selectStepHistory, selectIsStepComplete } from "../../store/graphStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useGraphActions, useGraphKeyboardShortcuts } from "../../hooks/useGraphActions";
import { TIMING, SPEED_LEVELS } from "../../utility/constants";
import { GrainTexture } from "../ui/grain-texture";
import { VisualizationState, VisualizationMode } from "../../constants";
import { exportSvg } from "../../utility/exportSvg";
import { exportPng } from "../../utility/exportPng";
import { export3DPng } from "../../utility/export3DPng";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

// Extracted components
import { ThemeSelector } from "./ThemeSelector";
import { AlgorithmHint } from "./AlgorithmHint";
import { StepControls } from "./StepControls";
import { SpeedControl } from "./SpeedControl";
import { ModeToggle } from "./ModeToggle";
import { ZoomControls } from "./ZoomControls";

export const Board = () => {
  // Get state from store
  const visualizationAlgorithm = useGraphStore((state) => state.visualization.algorithm);
  const visualizationState = useGraphStore((state) => state.visualization.state);
  const visualizationInput = useGraphStore((state) => state.visualization.input);
  const hasNodes = useGraphStore((state) => state.data.nodes.length > 0);
  const visualizationSpeed = useGraphStore((state) => state.visualization.speed);
  const zoom = useGraphStore((state) => state.viewport.zoom);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const stepIndex = useGraphStore(selectStepIndex);
  const stepHistory = useGraphStore(selectStepHistory);
  const isStepComplete = useGraphStore(selectIsStepComplete);

  // Derive boolean for simpler component logic
  const isVisualizing = visualizationState === VisualizationState.RUNNING;

  // Theme state (from separate settings store - persists across graph resets)
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  // 3D mode state
  const is3DMode = useSettingsStore((state) => state.is3DMode);
  const setIs3DMode = useSettingsStore((state) => state.setIs3DMode);

  // Actions from store
  const setVisualizationAlgorithm = useGraphStore((state) => state.setVisualizationAlgorithm);
  const setVisualizationSpeed = useGraphStore((state) => state.setVisualizationSpeed);
  const resetGraph = useGraphStore((state) => state.resetGraph);
  const setVisualizationMode = useGraphStore((state) => state.setVisualizationMode);

  // Auto-play state for step mode
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // Refs to access Graph elements for export
  const graphRef = useRef<GraphHandle>(null);
  const graph3DRef = useRef<Graph3DHandle>(null);

  // Centralized actions from useGraphActions hook
  const { actions, handleKeyDown } = useGraphActions({
    playState: { isPlaying, setIsPlaying, playIntervalRef }
  });

  // Register keyboard shortcuts
  useGraphKeyboardShortcuts(handleKeyDown);

  // Track if we're on desktop for responsive dropdown alignment
  const isDesktop = useIsDesktop();

  // Clear play interval on unmount or when visualization ends
  useEffect(() => {
    return () => {
      if (playIntervalRef.current !== null) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Stop auto-play when step mode visualization ends
  useEffect(() => {
    if (!isVisualizing || visualizationMode !== VisualizationMode.MANUAL) {
      if (playIntervalRef.current !== null) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
    }
  }, [isVisualizing, visualizationMode]);

  // Stop auto-play when we reach the end
  useEffect(() => {
    if (isStepComplete && isPlaying) {
      if (playIntervalRef.current !== null) {
        clearInterval(playIntervalRef.current);
        playIntervalRef.current = null;
      }
      setIsPlaying(false);
    }
  }, [isStepComplete, isPlaying]);

  const handleAlgoChange = (algoId: string) => {
    const algo = algorithmRegistry.get(algoId);
    if (!algo) return;

    const selectedOption = {
      key: algoId,
      text: algo.metadata.name,
      data: algo.metadata.type,
    };

    setVisualizationAlgorithm(selectedOption);
  };

  const handleReset = () => {
    resetGraph();
  };

  // Speed control handlers
  const currentSpeedIndex = SPEED_LEVELS.findIndex(l => l.ms === visualizationSpeed);
  const currentSpeedMultiplier = currentSpeedIndex >= 0
    ? SPEED_LEVELS[currentSpeedIndex].multiplier
    : '1x';

  const handleIncreaseSpeed = () => {
    if (currentSpeedIndex < SPEED_LEVELS.length - 1) {
      setVisualizationSpeed(SPEED_LEVELS[currentSpeedIndex + 1].ms);
    }
  };

  const handleDecreaseSpeed = () => {
    if (currentSpeedIndex > 0) {
      setVisualizationSpeed(SPEED_LEVELS[currentSpeedIndex - 1].ms);
    }
  };

  // Export SVG handler (2D only)
  const handleExportSvg = useCallback(async () => {
    const svgElement = graphRef.current?.getSvgElement();
    if (svgElement) {
      await exportSvg(svgElement, { includeGrid: true, filename: 'graph.svg' });
    }
  }, []);

  // Export PNG handler (2D only)
  const handleExport2DPng = useCallback(async () => {
    const svgElement = graphRef.current?.getSvgElement();
    if (svgElement) {
      await exportPng(svgElement, { includeGrid: true, filename: 'graph.png' });
    }
  }, []);

  // Export PNG handler (3D only)
  const handleExport3DPng = useCallback(async () => {
    const canvas = graph3DRef.current?.getCanvas();
    if (canvas) {
      await export3DPng(canvas, { filename: 'graph-3d.png' });
    }
  }, []);

  // Determine if we should show step mode controls
  const isInStepMode = visualizationMode === VisualizationMode.MANUAL && isVisualizing && stepHistory.length > 0;

  // Get algorithm hint text
  const getAlgorithmHintText = () => {
    if (visualizationInput && visualizationInput.startNodeId !== -1 && visualizationInput.endNodeId === -1) {
      return "Now select the destination node";
    }
    return algorithmRegistry.get(visualizationAlgorithm?.key || '')?.metadata.description || '';
  };

  return (
    <TooltipProvider delayDuration={TIMING.TOOLTIP_DELAY}>
      <div className="h-dvh w-screen relative overflow-hidden">
        {/* Background color */}
        <div className="absolute inset-0 pointer-events-none bg-[var(--color-paper)]" />

        {/* Full-screen Graph with crossfade transition */}
        <div className="absolute inset-0 touch-action-manipulation">
          <AnimatePresence mode="wait">
            {is3DMode ? (
              <motion.div
                key="3d"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Suspense
                  fallback={
                    <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
                      Loading 3D...
                    </div>
                  }
                >
                  <Graph3D ref={graph3DRef} />
                </Suspense>
              </motion.div>
            ) : (
              <motion.div
                key="2d"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Graph ref={graphRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Toolbar - Bottom on mobile, Top on desktop */}
        <div className="fixed z-50 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-auto md:top-5 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] flex flex-col gap-2">
          {/* Mobile: Floating Undo/Redo/Delete - aligned to right edge of toolbar */}
          <div className="flex justify-between">
            <div className="z-40 gap-2">
              {/* Zoom controls group - Mobile only */}
              <div className="md:hidden relative flex items-center gap-0.5 px-1 py-1 rounded-md overflow-hidden backdrop-blur-sm">
                <ZoomControls
                  zoom={zoom}
                  onZoomIn={actions.zoomIn.execute}
                  onZoomOut={actions.zoomOut.execute}
                  onZoomReset={actions.resetZoom.execute}
                />
              </div>
            </div>
            <div className="flex md:hidden items-center gap-0.5 px-1 py-1 rounded-md backdrop-blur-sm">
              <Button
                onClick={actions.undo.execute}
                disabled={!actions.undo.enabled}
                variant="ghost"
                size="icon-sm"
                aria-label="Undo"
              >
                <Undo2 size={16} className={cn(actions.undo.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
              </Button>
              <Button
                onClick={actions.redo.execute}
                disabled={!actions.redo.enabled}
                variant="ghost"
                size="icon-sm"
                aria-label="Redo"
              >
                <Redo2 size={16} className={cn(actions.redo.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
              </Button>
              <div className="w-px h-5 mx-0.5 bg-[var(--color-divider)]" />
              <Button
                onClick={actions.deleteSelectedNode.execute}
                disabled={!actions.deleteSelectedNode.enabled}
                variant="ghost"
                size="icon-sm"
                aria-label="Delete selected node"
              >
                <Trash2 size={16} className={cn(actions.deleteSelectedNode.enabled ? "text-[var(--color-error)]" : "text-[var(--color-text-muted)]")} />
              </Button>
            </div>
          </div>

          {/* Main toolbar */}
          <div className="flex items-center relative px-1.5 py-1.5 rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-raised-lg),var(--highlight-edge)]">
            <GrainTexture baseFrequency={3} className="rounded-md" />

            {/* Mode toggle - hidden during step visualization */}
            {!isInStepMode && (
              <ModeToggle
                mode={visualizationMode}
                onModeChange={setVisualizationMode}
                disabled={isVisualizing}
              />
            )}

            {/* Algorithm picker - hidden on mobile during step mode */}
            <div className={cn(isInStepMode && "hidden md:block")}>
              <AlgorithmPicker
                selectedAlgo={visualizationAlgorithm}
                onSelect={handleAlgoChange}
                disabled={isVisualizing || !hasNodes}
              />
            </div>

            {/* Graph Generator - hidden during step mode visualization */}
            {!isInStepMode && (
              <>
                <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />
                <GraphGenerator disabled={isVisualizing} />
              </>
            )}

            {/* Step controls - shown when in manual step mode during visualization */}
            {isInStepMode && (
              <StepControls
                stepIndex={stepIndex}
                totalSteps={stepHistory.length}
                isPlaying={isPlaying}
                canStepBackward={actions.stepBackward.enabled}
                canStepForward={actions.stepForward.enabled}
                onJumpToStart={actions.jumpToStart.execute}
                onStepBackward={actions.stepBackward.execute}
                onStepForward={actions.stepForward.execute}
                onJumpToEnd={actions.jumpToEnd.execute}
                onTogglePlay={actions.togglePlay.execute}
                onStop={actions.stopVisualization.execute}
              />
            )}

            {/* Speed control - Desktop only (hidden during step mode) */}
            <div className={cn("hidden md:flex items-center", isInStepMode && "!hidden")}>
              <SpeedControl
                speedMultiplier={currentSpeedMultiplier}
                disabled={isVisualizing}
                canDecrease={currentSpeedIndex > 0}
                canIncrease={currentSpeedIndex < SPEED_LEVELS.length - 1}
                onDecrease={handleDecreaseSpeed}
                onIncrease={handleIncreaseSpeed}
              />
            </div>

            {/* Normal toolbar controls - hidden during step mode visualization */}
            {!isInStepMode && (
              <>
                {/* Divider */}
                <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />

                {/* 3D Toggle Button - Desktop only */}
                <div className="hidden md:block">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() => setIs3DMode(!is3DMode)}
                        variant="ghost"
                        size="icon-sm"
                        className={cn(
                          "z-10",
                          is3DMode && "bg-[var(--color-accent-form)] hover:bg-[var(--color-accent-form)]"
                        )}
                        disabled={isVisualizing}
                      >
                        <Box size={16} className={cn(is3DMode ? "text-white" : "text-[var(--color-text)]")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{is3DMode ? "Switch to 2D" : "Switch to 3D"}</TooltipContent>
                  </Tooltip>
                </div>

                {/* Export - direct button in 3D mode, dropdown in 2D mode */}
                {is3DMode ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleExport3DPng}
                        disabled={isVisualizing || !hasNodes}
                        variant="ghost"
                        size="icon-sm"
                        className="z-10"
                      >
                        <Download className="h-4 w-4 text-[var(--color-text)]" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Export PNG</TooltipContent>
                  </Tooltip>
                ) : (
                  <DropdownMenu>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            disabled={isVisualizing || !hasNodes}
                            variant="ghost"
                            size="icon-sm"
                            className="z-10"
                          >
                            <Download className="h-4 w-4 text-[var(--color-text)]" />
                          </Button>
                        </DropdownMenuTrigger>
                      </TooltipTrigger>
                      <TooltipContent>Export</TooltipContent>
                    </Tooltip>
                    <DropdownMenuContent align="center" sideOffset={8}>
                      <DropdownMenuItem onClick={handleExportSvg}>
                        <FileCode className="h-4 w-4 mr-2" />
                        Export as SVG
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleExport2DPng}>
                        <Image className="h-4 w-4 mr-2" />
                        Export as PNG
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                {/* Reset button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleReset}
                      disabled={isVisualizing}
                      variant="ghost"
                      size="icon-sm"
                      className="z-10"
                    >
                      <RotateCcw className="h-4 w-4 text-[var(--color-error)]" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Reset Graph</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </div>

        {/* Algorithm Instruction Hint - appears when algorithm is selected */}
        {visualizationAlgorithm?.key && visualizationAlgorithm.key !== "select" && !isVisualizing && (
          <AlgorithmHint text={getAlgorithmHintText()} />
        )}

        {/* Floating Zoom & Undo Controls - Desktop only */}
        <div className="hidden md:flex fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 gap-2">
          {/* Zoom controls group */}
          <div className="relative flex items-center gap-0.5 px-1 py-1 rounded-md overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)]">
            <GrainTexture baseFrequency={4.2} className="rounded-md" />
            <ZoomControls
              zoom={zoom}
              onZoomIn={actions.zoomIn.execute}
              onZoomOut={actions.zoomOut.execute}
              onZoomReset={actions.resetZoom.execute}
            />
          </div>

          {/* Undo/Redo controls group - with grainy texture */}
          <div className="relative flex items-center gap-0.5 px-1 py-1 rounded-md overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)]">
            <GrainTexture baseFrequency={4.2} className="rounded-md" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={actions.undo.execute}
                  disabled={!actions.undo.enabled}
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10"
                  aria-label="Undo"
                >
                  <Undo2 size={16} className={cn(actions.undo.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo (⌘+Z)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={actions.redo.execute}
                  disabled={!actions.redo.enabled}
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10"
                  aria-label="Redo"
                >
                  <Redo2 size={16} className={cn(actions.redo.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo (⌘+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Theme selector - Top left on mobile, bottom right on desktop */}
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] md:top-auto md:left-auto md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-[max(1rem,env(safe-area-inset-right))] z-40">
          <ThemeSelector
            theme={theme}
            setTheme={setTheme}
            alignDropdown={isDesktop ? "end" : "start"}
          />
        </div>

      </div>
    </TooltipProvider>
  );
};
