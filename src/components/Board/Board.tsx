import { useState, useRef, useEffect } from "react";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { motion, useReducedMotion } from "motion/react";
import { Graph } from "../Graph/Graph";
import { cn } from "@/lib/utils";
import { algorithmRegistry } from "../../algorithms";
import { AlgorithmPicker } from "../ui/algorithm-picker";
import { GraphGenerator } from "../ui/graph-generator";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../ui/tooltip";
import {
  RotateCcw, Undo2, Redo2, ZoomIn, ZoomOut, Trash2,
  SkipBack, ChevronLeft, ChevronRight, SkipForward, Play, Pause,
  Sun, Moon, Monitor, Check, Minus, Plus
} from "lucide-react";
import { SunMoonIcon as ThemeIcon } from '../ui/icons/SunMoonIcon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { useGraphStore, selectStepIndex, selectStepHistory, selectIsStepComplete } from "../../store/graphStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useGraphActions, useGraphKeyboardShortcuts } from "../../hooks/useGraphActions";
import { MOD_KEY } from "../../utility/keyboard";
import { ZOOM, TIMING, SPEED_LEVELS } from "../../utility/constants";
import { GrainTexture } from "../ui/grain-texture";
import { RadixToggleGroup, RadixToggleGroupItem } from "../ui/toggle-group";
import { VisualizationState, VisualizationMode, THEME } from "../../constants";

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

  // Actions from store
  const setVisualizationAlgorithm = useGraphStore((state) => state.setVisualizationAlgorithm);
  const setVisualizationSpeed = useGraphStore((state) => state.setVisualizationSpeed);
  const resetGraph = useGraphStore((state) => state.resetGraph);
  const setVisualizationMode = useGraphStore((state) => state.setVisualizationMode);

  // Auto-play state for step mode
  const [isPlaying, setIsPlaying] = useState(false);
  const playIntervalRef = useRef<number | null>(null);

  // Centralized actions from useGraphActions hook
  const { actions, handleKeyDown } = useGraphActions({
    playState: { isPlaying, setIsPlaying, playIntervalRef }
  });

  // Register keyboard shortcuts
  useGraphKeyboardShortcuts(handleKeyDown);

  // Track if we're on desktop for responsive dropdown alignment
  const isDesktop = useIsDesktop();

  // Respect user's reduced motion preferences
  const prefersReducedMotion = useReducedMotion();

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

  return (
    <TooltipProvider delayDuration={TIMING.TOOLTIP_DELAY}>
      <div className="h-dvh w-screen relative overflow-hidden">
        {/* Background color */}
        <div className="absolute inset-0 pointer-events-none bg-[var(--color-paper)]" />

        {/* Full-screen Graph - no props needed, reads from store */}
        <div className="absolute inset-0 touch-action-manipulation">
          <Graph />
        </div>

        {/* Toolbar - Bottom on mobile, Top on desktop */}
        <div className="fixed z-50 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-auto md:top-5 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] flex flex-col gap-2">
          {/* Mobile: Floating Undo/Redo/Delete - aligned to right edge of toolbar */}
          <div className="flex justify-between">
            <div className="z-40 gap-2">
              {/* Zoom controls group */}
              <div className="md:hidden relative flex items-center gap-0.5 px-1 py-1 rounded-md overflow-hidden backdrop-blur-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={actions.zoomOut.execute}
                      disabled={zoom <= ZOOM.MIN}
                      variant="ghost"
                      size="icon-sm"
                      className="relative z-10"
                    >
                      <ZoomOut className={cn("h-4 w-4", zoom > ZOOM.MIN ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom Out ({MOD_KEY}−)</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={actions.resetZoom.execute}
                      aria-label="Reset zoom"
                      className="px-2 py-1 font-['JetBrains_Mono'] text-[12px] tabular-nums rounded-md hover:bg-[var(--color-interactive-hover)] transition-colors min-w-[44px] relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50 text-[var(--color-text)]"
                    >
                      {Math.round(zoom * 100)}%
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Reset Zoom</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={actions.zoomIn.execute}
                      disabled={zoom >= ZOOM.MAX}
                      variant="ghost"
                      size="icon-sm"
                      className="relative z-10"
                      aria-label="Zoom in"
                    >
                      <ZoomIn className={cn("h-4 w-4", zoom < ZOOM.MAX ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Zoom In ({MOD_KEY}+)</TooltipContent>
                </Tooltip>
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

          {/* Mode toggle - hidden during step visualization */}
          <div className="flex items-center relative px-1.5 py-1.5 rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-raised-lg),var(--highlight-edge)]">
            <GrainTexture baseFrequency={3} opacity={30} className="rounded-md" />
            {!(visualizationMode === VisualizationMode.MANUAL && isVisualizing && stepHistory.length > 0) && (
              <>
                <RadixToggleGroup
                  type="single"
                  value={visualizationMode}
                  onValueChange={(value) => value && setVisualizationMode(value as VisualizationMode)}
                  variant="pressed"
                  disabled={isVisualizing}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">
                        <RadixToggleGroupItem
                          value={VisualizationMode.AUTO}
                          className="px-2.5 py-1 text-[12px] font-['Outfit'] w-full"
                        >
                          Auto
                        </RadixToggleGroupItem>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Runs visualization automatically</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex-1">
                        <RadixToggleGroupItem
                          value={VisualizationMode.MANUAL}
                          className="px-2.5 py-1 text-[12px] font-['Outfit'] w-full"
                        >
                          Step
                        </RadixToggleGroupItem>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Control each step manually</TooltipContent>
                  </Tooltip>
                </RadixToggleGroup>

                <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />
              </>
            )}

            {/* Algorithm picker - hidden on mobile during step mode */}
            <div className={cn(
              visualizationMode === VisualizationMode.MANUAL && isVisualizing && stepHistory.length > 0 && "hidden md:block"
            )}>
              <AlgorithmPicker
                selectedAlgo={visualizationAlgorithm}
                onSelect={handleAlgoChange}
                disabled={isVisualizing || !hasNodes}
              />
            </div>

            {/* Graph Generator - hidden during step mode visualization */}
            {!(visualizationMode === VisualizationMode.MANUAL && isVisualizing && stepHistory.length > 0) && (
              <>
                <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />
                <GraphGenerator disabled={isVisualizing} />
              </>
            )}

            {/* Step controls - shown when in manual step mode during visualization */}
            {visualizationMode === VisualizationMode.MANUAL && isVisualizing && stepHistory.length > 0 && (
              <>
                {/* Divider - hidden on mobile since algorithm dropdown is also hidden */}
                <div className="hidden md:block w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />

                <div className="flex items-center gap-0.5">
                  {/* Jump to start */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={actions.jumpToStart.execute}
                        disabled={!actions.stepBackward.enabled}
                        variant="ghost"
                        size="icon-sm"
                        className="z-10"
                      >
                        <SkipBack className={cn("h-4 w-4", actions.stepBackward.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Jump to Start (Home)</TooltipContent>
                  </Tooltip>

                  {/* Step backward */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={actions.stepBackward.execute}
                        disabled={!actions.stepBackward.enabled}
                        variant="ghost"
                        size="icon-sm"
                        className="z-10"
                      >
                        <ChevronLeft className={cn("h-4 w-4", actions.stepBackward.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Previous Step (←)</TooltipContent>
                  </Tooltip>

                  {/* Step counter */}
                  <span className="font-['JetBrains_Mono'] text-[12px] md:text-[13px] tabular-nums px-2 min-w-[60px] whitespace-nowrap text-center text-[var(--color-text)]">
                    {stepIndex + 1} / {stepHistory.length}
                  </span>

                  {/* Step forward */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={actions.stepForward.execute}
                        disabled={!actions.stepForward.enabled}
                        variant="ghost"
                        size="icon-sm"
                        className="z-10"
                      >
                        <ChevronRight className={cn("h-4 w-4", actions.stepForward.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Next Step (→)</TooltipContent>
                  </Tooltip>

                  {/* Jump to end */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={actions.jumpToEnd.execute}
                        disabled={!actions.stepForward.enabled}
                        variant="ghost"
                        size="icon-sm"
                        className="z-10"
                      >
                        <SkipForward className={cn("h-4 w-4", actions.stepForward.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Jump to End (End)</TooltipContent>
                  </Tooltip>

                  {/* Play/Pause */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={actions.togglePlay.execute}
                        disabled={!actions.togglePlay.enabled}
                        variant="ghost"
                        size="icon-sm"
                        className="z-10"
                      >
                        {isPlaying ? (
                          <Pause className="h-4 w-4 text-[var(--color-text)]" />
                        ) : (
                          <Play className={cn("h-4 w-4", actions.stepForward.enabled ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{isPlaying ? 'Pause (Space)' : 'Play (Space)'}</TooltipContent>
                  </Tooltip>
                </div>

                {/* Stop/Done button */}
                <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={actions.stopVisualization.execute}
                      variant="ghost"
                      className="h-9 px-3 z-10 !rounded-md font-['Outfit'] text-[13px] text-[var(--color-error)]"
                    >
                      Done
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>End Visualization</TooltipContent>
                </Tooltip>
              </>
            )}

            {/* Speed control - Desktop only (hidden during step mode) */}
            <div className={cn("hidden md:flex items-center", visualizationMode === VisualizationMode.MANUAL && isVisualizing && "!hidden")}>
              {/* Divider */}
              <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />

              {/* Speed stepper */}
              <div className="flex items-center gap-0.5 px-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleDecreaseSpeed}
                      disabled={isVisualizing || currentSpeedIndex <= 0}
                      variant="ghost"
                      size="icon-xs"
                      className="z-10"
                    >
                      <Minus className={cn("h-3.5 w-3.5", currentSpeedIndex > 0 && !isVisualizing ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Slower</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="font-['JetBrains_Mono'] text-[12px] min-w-[32px] text-center tabular-nums cursor-help text-[var(--color-text)]">
                      {currentSpeedMultiplier}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Visualization Speed</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleIncreaseSpeed}
                      disabled={isVisualizing || currentSpeedIndex >= SPEED_LEVELS.length - 1}
                      variant="ghost"
                      size="icon-xs"
                      className="z-10"
                    >
                      <Plus className={cn("h-3.5 w-3.5", currentSpeedIndex < SPEED_LEVELS.length - 1 && !isVisualizing ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Faster</TooltipContent>
                </Tooltip>
              </div>
            </div>

            {/* Normal toolbar controls - hidden during step mode visualization */}
            {!(visualizationMode === VisualizationMode.MANUAL && isVisualizing && stepHistory.length > 0) && (
              <>
                {/* Divider */}
                <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />

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
          <motion.div
            initial={prefersReducedMotion ? false : { scale: 0, opacity: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={prefersReducedMotion ? { duration: 0 } : undefined}
            className={cn(
              "fixed z-40 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)]",
              // Mobile: center top
              "top-4",
              // Desktop: center bottom
              "md:top-auto md:bottom-5",

            )}
          >
            <div className="relative px-4 py-2.5 rounded-md text-[13px] font-['Outfit'] text-center overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)] text-[var(--color-text-muted)]">
              <span className="relative z-10">
                {/* Show different hint for pathfinding after first node is selected */}
                {visualizationInput && visualizationInput.startNodeId !== -1 && visualizationInput.endNodeId === -1
                  ? "Now select the destination node"
                  : algorithmRegistry.get(visualizationAlgorithm.key)?.metadata.description}
              </span>
            </div>
          </motion.div>
        )}

        {/* Floating Zoom & Undo Controls - Desktop only */}
        <div className="hidden md:flex fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 gap-2">
          {/* Zoom controls group */}
          <div className="relative flex items-center gap-0.5 px-1 py-1 rounded-md overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)]">
            <GrainTexture baseFrequency={4.2} opacity={40} className="rounded-md" />
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={actions.zoomOut.execute}
                  disabled={zoom <= ZOOM.MIN}
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10"
                  aria-label="Zoom out"
                >
                  <ZoomOut className={cn("h-4 w-4", zoom > ZOOM.MIN ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom Out ({MOD_KEY}−)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={actions.resetZoom.execute}
                  aria-label="Reset zoom"
                  className="px-2 py-1 font-['JetBrains_Mono'] text-[12px] tabular-nums rounded-md hover:bg-[var(--color-interactive-hover)] transition-colors min-w-[44px] relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50 text-[var(--color-text)]"
                >
                  {Math.round(zoom * 100)}%
                </button>
              </TooltipTrigger>
              <TooltipContent>Reset Zoom</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={actions.zoomIn.execute}
                  disabled={zoom >= ZOOM.MAX}
                  variant="ghost"
                  size="icon-sm"
                  className="relative z-10"
                  aria-label="Zoom in"
                >
                  <ZoomIn className={cn("h-4 w-4", zoom < ZOOM.MAX ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Zoom In ({MOD_KEY}+)</TooltipContent>
            </Tooltip>
          </div>

          {/* Undo/Redo controls group - with grainy texture */}
          <div className="relative flex items-center gap-0.5 px-1 py-1 rounded-md overflow-hidden bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)]">
            <GrainTexture baseFrequency={4.2} opacity={40} className="rounded-md" />
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
              <TooltipContent>Undo ({MOD_KEY}+Z)</TooltipContent>
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
              <TooltipContent>Redo ({MOD_KEY}+Shift+Z)</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Settings button - Top left on mobile, bottom right on desktop */}
        <div className="fixed top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] md:top-auto md:left-auto md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-[max(1rem,env(safe-area-inset-right))] z-40">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                aria-label="Theme settings"
                className="relative h-10 w-10 flex items-center justify-center rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50"
              >
                <GrainTexture baseFrequency={4.2} opacity={40} className="rounded-md overflow-hidden" />
                <ThemeIcon size={24} className="text-[var(--color-text-muted)]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isDesktop ? "end" : "start"} sideOffset={8} className="w-40 font-['Outfit']">
              <DropdownMenuLabel className="text-xs font-medium">Theme</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setTheme(THEME.LIGHT)}
                className="cursor-pointer gap-2"
              >
                <Sun className="h-4 w-4" />
                <span className="flex-1">Light</span>
                {theme === THEME.LIGHT && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(THEME.DARK)}
                className="cursor-pointer gap-2"
              >
                <Moon className="h-4 w-4" />
                <span className="flex-1">Dark</span>
                {theme === THEME.DARK && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setTheme(THEME.SYSTEM)}
                className="cursor-pointer gap-2"
              >
                <Monitor className="h-4 w-4" />
                <span className="flex-1">System</span>
                {theme === THEME.SYSTEM && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

      </div>
    </TooltipProvider>
  );
};
