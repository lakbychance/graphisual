import { useState, useRef, useEffect, useCallback } from "react";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { GraphRenderer, type GraphRendererHandle } from "../GraphRenderer";
import { cn } from "@/lib/utils";
import { algorithmRegistry } from "../../algorithms";
import { AlgorithmPicker } from "../ui/algorithm-picker";
import { GraphGenerator } from "../ui/graph-generator";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import { RotateCcw, Undo2, Redo2, Trash2, Download, FileCode, Image, Box, Layers, Monitor } from "lucide-react";
import { useGraphStore, selectStepIndex, selectStepHistory, selectIsStepComplete } from "../../store/graphStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useGraphActions, useGraphKeyboardShortcuts } from "../../hooks/useGraphActions";
import { TIMING } from "../../constants/ui";
import { SPEED_LEVELS, VisualizationState, VisualizationMode } from "../../constants/visualization";
import { GrainTexture } from "../ui/grain-texture";
import { exportSvg } from "../../utils/export/exportSvg";
import { exportPng } from "../../utils/export/exportPng";
import { export3DPng } from "../../utils/export/export3DPng";
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
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { SpeedControl } from "./SpeedControl";
import { ModeToggle } from "./ModeToggle";
import { ZoomControls } from "./ZoomControls";
import { TracePanel } from "./TracePanel";
import { TraceToggle } from "./TraceToggle";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { Toolbar, ToolbarButton, ToolbarSeparator } from "../ui/toolbar";

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
  // Local UI state for trace panel visibility
  const [tracePanelVisible, setTracePanelVisible] = useState(true);

  // Derive boolean for simpler component logic
  const isVisualizing = visualizationState === VisualizationState.RUNNING;

  // Theme state (from separate settings store - persists across graph resets)
  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);

  // Render mode state
  const renderMode = useSettingsStore((state) => state.renderMode);
  const setRenderMode = useSettingsStore((state) => state.setRenderMode);
  const is3DMode = renderMode === '3d';

  // Actions from store
  const setVisualizationAlgorithm = useGraphStore((state) => state.setVisualizationAlgorithm);
  const setVisualizationSpeed = useGraphStore((state) => state.setVisualizationSpeed);
  const resetGraph = useGraphStore((state) => state.resetGraph);
  const setVisualizationMode = useGraphStore((state) => state.setVisualizationMode);

  // Auto-play state for step mode
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // Ref to access GraphRenderer for export
  const graphRendererRef = useRef<GraphRendererHandle>(null);

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

    setVisualizationAlgorithm({
      key: algoId,
      text: algo.metadata.name,
      data: algo.metadata.type,
    });
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
    const svgElement = graphRendererRef.current?.getGraphRef()?.getSvgElement();
    if (svgElement) {
      await exportSvg(svgElement, { includeGrid: true, filename: 'graph.svg' });
    }
  }, []);

  // Export PNG handler (2D only)
  const handleExport2DPng = useCallback(async () => {
    const svgElement = graphRendererRef.current?.getGraphRef()?.getSvgElement();
    if (svgElement) {
      await exportPng(svgElement, { includeGrid: true, filename: 'graph.png' });
    }
  }, []);

  // Export PNG handler (3D only)
  const handleExport3DPng = useCallback(async () => {
    const canvas = graphRendererRef.current?.getGraph3DRef()?.getCanvas();
    if (canvas) {
      await export3DPng(canvas, { filename: 'graph-3d.png' });
    }
  }, []);

  // Determine if we should show step mode controls
  const isInStepMode = visualizationMode === VisualizationMode.MANUAL && isVisualizing && stepHistory.length > 0;

  // Get algorithm hint text
  const getAlgorithmHintText = () => {
    const algo = algorithmRegistry.get(visualizationAlgorithm?.key || '');
    const hints = algo?.metadata.inputStepHints || [];
    if (visualizationInput?.startNodeId !== -1 && visualizationInput?.endNodeId === -1) {
      return hints[1] || '';
    }
    return hints[0] || '';
  };

  // Handle skip link - focus graph and select topmost node
  const handleSkipToGraph = useCallback(() => {
    const { data, selectNode } = useGraphStore.getState();
    const orderedNodeIds = [...data.stackingOrder];
    if (orderedNodeIds.length > 0) {
      const topmostNodeId = orderedNodeIds[orderedNodeIds.length - 1];
      selectNode(topmostNodeId);
      graphRendererRef.current?.getGraphRef()?.getSvgElement()?.focus();
    }
  }, []);

  return (
    <TooltipProvider delayDuration={TIMING.TOOLTIP_DELAY}>
      <main className="h-dvh w-screen relative overflow-hidden">
        {/* Skip link for keyboard navigation - first in tab order, 2D only, only if nodes exist */}
        {!is3DMode && hasNodes && (
          <Button variant="skipLink" onClick={handleSkipToGraph}>
            Skip to graph
          </Button>
        )}

        {/* Background color */}
        <div className="absolute inset-0 pointer-events-none bg-[var(--color-paper)]" />

        {/* Toolbar - Bottom on mobile, Top on desktop */}
        {/* DOM order: Toolbar first for natural tab order (toolbar → graph → other controls) */}
        <div className="fixed z-50 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-auto md:top-5 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] flex flex-col gap-2">
          {/* Mobile: Floating Undo/Redo/Delete - aligned to right edge of toolbar */}
          <div className="flex justify-between">
            <div className="z-40 gap-2">
              {/* Zoom controls group - Mobile only */}
              <Toolbar aria-label="Zoom controls" className="md:hidden relative flex items-center gap-2 p-2 rounded-md backdrop-blur-sm">
                <ZoomControls
                  zoom={zoom}
                  onZoomIn={actions.zoomIn.execute}
                  onZoomOut={actions.zoomOut.execute}
                  onZoomReset={actions.resetZoom.execute}
                />
              </Toolbar>
            </div>
            <Toolbar aria-label="Edit controls" className="flex md:hidden items-center gap-2 p-2 rounded-md backdrop-blur-sm">
              <ToolbarButton asChild>
                <Button
                  onClick={actions.undo.execute}
                  disabled={!actions.undo.enabled}
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Undo"
                >
                  <Undo2 size={16} className={cn(actions.undo.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                </Button>
              </ToolbarButton>
              <ToolbarButton asChild>
                <Button
                  onClick={actions.redo.execute}
                  disabled={!actions.redo.enabled}
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Redo"
                >
                  <Redo2 size={16} className={cn(actions.redo.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                </Button>
              </ToolbarButton>
              <ToolbarSeparator className="h-5 mx-0.5" />
              <ToolbarButton asChild>
                <Button
                  onClick={actions.deleteSelectedNodes.execute}
                  disabled={!actions.deleteSelectedNodes.enabled}
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Delete selected nodes"
                >
                  <Trash2 size={16} className={cn(actions.deleteSelectedNodes.enabled ? "text-[var(--color-error)]" : "text-[var(--color-text-muted)]")} />
                </Button>
              </ToolbarButton>
            </Toolbar>
          </div>

          {/* Main toolbar */}
          <Toolbar aria-label="Graph controls" className="flex items-center relative p-2 rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-premium)]">
            <GrainTexture baseFrequency={3} className="rounded-md" />

            {/* Mode toggle */}
            <ModeToggle
              mode={visualizationMode}
              onModeChange={setVisualizationMode}
              disabled={isVisualizing}
            />

            {/* Algorithm picker */}
            <AlgorithmPicker
              selectedAlgo={visualizationAlgorithm}
              onSelect={handleAlgoChange}
              disabled={isVisualizing || !hasNodes}
            />

            {/* Graph Generator */}
            <ToolbarSeparator />
            <GraphGenerator disabled={isVisualizing} />

            {/* Speed control - Desktop only */}
            {isDesktop && (
              <SpeedControl
                speedMultiplier={currentSpeedMultiplier}
                disabled={isVisualizing}
                canDecrease={currentSpeedIndex > 0}
                canIncrease={currentSpeedIndex < SPEED_LEVELS.length - 1}
                onDecrease={handleDecreaseSpeed}
                onIncrease={handleIncreaseSpeed}
              />
            )}

            <ToolbarSeparator />

            {/* Last toolbar items - wrapped for consistent gap */}
            <div className="flex items-center gap-1 md:gap-2">
              {/* Render Mode Selector - Desktop only */}
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToolbarButton asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="z-10 hidden md:inline-flex"
                          disabled={isVisualizing}
                          aria-label="Render mode"
                        >
                          {renderMode === '3d' ? (
                            <Box size={16} className="text-[var(--color-text)]" />
                          ) : renderMode === 'canvas' ? (
                            <Layers size={16} className="text-[var(--color-text)]" />
                          ) : (
                            <Monitor size={16} className="text-[var(--color-text)]" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                    </ToolbarButton>
                  </TooltipTrigger>
                  <TooltipContent>Render mode</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="center" sideOffset={8}>
                  <DropdownMenuItem onClick={() => setRenderMode('svg')} className={cn(renderMode === 'svg' && "bg-accent")}>
                    <Monitor className="h-4 w-4 mr-2" />
                    SVG (Default)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRenderMode('canvas')} className={cn(renderMode === 'canvas' && "bg-accent")}>
                    <Layers className="h-4 w-4 mr-2" />
                    Canvas (Fast)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRenderMode('3d')} className={cn(renderMode === '3d' && "bg-accent")}>
                    <Box className="h-4 w-4 mr-2" />
                    3D View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Export - direct button in 3D mode, dropdown in 2D mode */}
              {is3DMode ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ToolbarButton asChild>
                      <Button
                        onClick={handleExport3DPng}
                        disabled={isVisualizing || !hasNodes}
                        variant="ghost"
                        size="icon-sm"
                        className="z-10"
                        aria-label="Export PNG"
                      >
                        <Download className="h-4 w-4 text-[var(--color-text)]" />
                      </Button>
                    </ToolbarButton>
                  </TooltipTrigger>
                  <TooltipContent>Export PNG</TooltipContent>
                </Tooltip>
              ) : (
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <ToolbarButton asChild>
                        <DropdownMenuTrigger asChild>
                          <Button
                            disabled={isVisualizing || !hasNodes}
                            variant="ghost"
                            size="icon-sm"
                            className="z-10"
                            aria-label="Export"
                          >
                            <Download className="h-4 w-4 text-[var(--color-text)]" />
                          </Button>
                        </DropdownMenuTrigger>
                      </ToolbarButton>
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
                  <ToolbarButton asChild>
                    <Button
                      onClick={handleReset}
                      disabled={isVisualizing}
                      variant="ghost"
                      size="icon-sm"
                      className="z-10"
                      aria-label="Reset Graph"
                    >
                      <RotateCcw className="h-4 w-4 text-[var(--color-error)]" />
                    </Button>
                  </ToolbarButton>
                </TooltipTrigger>
                <TooltipContent>Reset Graph</TooltipContent>
              </Tooltip>
            </div>
          </Toolbar>

        </div>

        {/* Step controls - fixed position, top on mobile, below toolbar on desktop */}
        {/* DOM order: After main toolbar for natural tab flow during step mode */}
        <AnimatePresence>
          {isInStepMode && (
            <m.div
              initial={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="fixed z-50 top-[max(0.75rem,env(safe-area-inset-top))] left-4 right-4 md:top-[5.5rem] min-[450px]:left-1/2 min-[450px]:right-auto min-[450px]:-translate-x-1/2"
            >
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
            </m.div>
          )}
        </AnimatePresence>

        {/* Trace Panel - Desktop only, bottom center, hidden during RESULT steps */}
        <AnimatePresence>
          {isInStepMode && tracePanelVisible && stepIndex >= 0 && stepHistory[stepIndex]?.trace && (
            <TracePanel
              trace={stepHistory[stepIndex].trace}
              onCollapse={() => setTracePanelVisible(false)}
            />
          )}
        </AnimatePresence>

        {/* Full-screen Graph with crossfade transition */}
        {/* DOM order: After toolbar/step controls for natural tab order */}
        <div className="absolute inset-0 touch-action-manipulation">
          <GraphRenderer ref={graphRendererRef} />
        </div>

        {/* Algorithm Instruction Hint - appears when algorithm is selected */}
        <AnimatePresence>
          {visualizationAlgorithm?.key && visualizationAlgorithm.key !== "select" && !isVisualizing && (
            <AlgorithmHint text={getAlgorithmHintText()} algorithmName={visualizationAlgorithm.key} />
          )}
        </AnimatePresence>

        {/* Floating Zoom & Undo Controls - Desktop only */}
        <div className="hidden md:flex fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 gap-2">
          {/* Zoom controls group */}
          <Toolbar aria-label="Zoom controls" className="relative flex items-center gap-2 p-2 rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-premium)]">
            <GrainTexture baseFrequency={4.2} className="rounded-md" />
            <ZoomControls
              zoom={zoom}
              onZoomIn={actions.zoomIn.execute}
              onZoomOut={actions.zoomOut.execute}
              onZoomReset={actions.resetZoom.execute}
            />
          </Toolbar>

          {/* Undo/Redo controls group - with grainy texture */}
          <Toolbar aria-label="History controls" className="relative flex items-center gap-2 p-2 rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-premium)]">
            <GrainTexture baseFrequency={4.2} className="rounded-md" />
            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarButton asChild>
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
                </ToolbarButton>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <ToolbarButton asChild>
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
                </ToolbarButton>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>
          </Toolbar>
        </div>

        {/* Theme selector & keyboard shortcuts - Top left on mobile, bottom right on desktop */}
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] md:top-auto md:left-auto md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-[max(1rem,env(safe-area-inset-right))] z-40 flex items-center gap-2">
          {/* Trace toggle - Desktop only, visible when panel is collapsed during step mode */}
          <AnimatePresence>
            {isInStepMode && !tracePanelVisible && (
              <TraceToggle onExpand={() => setTracePanelVisible(true)} />
            )}
          </AnimatePresence>
          {/* Keyboard shortcuts - Desktop only */}
          <div className="hidden md:block">
            <KeyboardShortcuts />
          </div>
          <ThemeSelector
            theme={theme}
            setTheme={setTheme}
            alignDropdown={isDesktop ? "end" : "start"}
          />
        </div>

      </main>
    </TooltipProvider>
  );
};
