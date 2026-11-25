import { useState, useRef, useCallback } from "react";
import { useIsDesktop } from "../../hooks/useMediaQuery";
import { GraphRenderer, type GraphRendererHandle } from "../GraphRenderer";
import { algorithmRegistry } from "../../algorithms";
import { Button, Toolbar } from "@/components/ui-sdk";
import { IconAction } from "../ui/icon-action";
import { Undo2, Redo2 } from "lucide-react";
import { useGraphStore, selectStepIndex, selectStepRun, selectIsPlaying, selectCanUndo, selectCanRedo, selectIsInStepMode, selectCanStepForward, selectCanStepBackward } from "../../store/graphStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useGraphActions, useGraphKeyboardShortcuts } from "../../hooks/useGraphActions";
import { useAutoPlay } from "../../hooks/useAutoPlay";
import { useAlgorithmFromUrl } from "../../hooks/useAlgorithmFromUrl";
import { VisualizationState } from "../../constants/visualization";
import { traceAt } from "../../utils/visualization/runView";

import { MainToolbar } from "./MainToolbar";
import { MobileControls } from "./MobileControls";
import { ThemeSelector } from "./ThemeSelector";
import { AlgorithmHint } from "./AlgorithmHint";
import { StepControls } from "./StepControls";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { ZoomControls } from "./ZoomControls";
import { TracePanel } from "./TracePanel";
import { TraceToggle } from "./TraceToggle";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";

export const Board = () => {
  const visualizationAlgorithm = useGraphStore((state) => state.visualization.algorithm);
  const visualizationState = useGraphStore((state) => state.visualization.state);
  const visualizationInput = useGraphStore((state) => state.visualization.input);
  const hasNodes = useGraphStore((state) => state.data.nodes.length > 0);
  const stepIndex = useGraphStore(selectStepIndex);
  const stepRun = useGraphStore(selectStepRun);
  const isPlaying = useGraphStore(selectIsPlaying);
  const canUndo = useGraphStore(selectCanUndo);
  const canRedo = useGraphStore(selectCanRedo);
  const isInStepMode = useGraphStore(selectIsInStepMode);
  const canStepForward = useGraphStore(selectCanStepForward);
  const canStepBackward = useGraphStore(selectCanStepBackward);

  const [tracePanelVisible, setTracePanelVisible] = useState(true);

  const isVisualizing = visualizationState === VisualizationState.RUNNING;
  const stepTrace = traceAt(stepRun, stepIndex);

  const theme = useSettingsStore((state) => state.theme);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const renderMode = useSettingsStore((state) => state.renderMode);
  const is3DMode = renderMode === "3d";

  const graphRendererRef = useRef<GraphRendererHandle>(null);

  useAutoPlay();
  useAlgorithmFromUrl();

  const execute = useGraphActions();
  useGraphKeyboardShortcuts(execute.handleKeyDown);

  const isDesktop = useIsDesktop();

  const getAlgorithmHintText = () => {
    const algo = algorithmRegistry.get(visualizationAlgorithm?.key || "");
    const hints = algo?.metadata.inputStepHints || [];
    if (visualizationInput?.startNodeId !== -1 && visualizationInput?.endNodeId === -1) {
      return hints[1] || "";
    }
    return hints[0] || "";
  };

  const handleSkipToGraph = useCallback(() => {
    const { data, selectNode } = useGraphStore.getState();
    const orderedNodeIds = [...data.stackingOrder];
    if (orderedNodeIds.length > 0) {
      const topmostNodeId = orderedNodeIds[orderedNodeIds.length - 1];
      selectNode(topmostNodeId);
      const currentRenderMode = useSettingsStore.getState().renderMode;
      if (currentRenderMode === "canvas") {
        graphRendererRef.current?.getCanvasGraphRef()?.getCanvasElement()?.focus();
      } else {
        graphRendererRef.current?.getGraphRef()?.getSvgElement()?.focus();
      }
    }
  }, []);

  return (
    <>
      <main className="h-dvh w-screen relative overflow-hidden">
        {/* Skip link for keyboard navigation - first in tab order, 2D only, only if nodes exist */}
        {!is3DMode && hasNodes && (
          <Button variant="skipLink" onClick={handleSkipToGraph}>
            Skip to graph
          </Button>
        )}

        {/* Background color */}
        <div className="absolute inset-0 pointer-events-none canvas-surface" />

        {/* Toolbar - Bottom on mobile, Top on desktop */}
        {/* DOM order: Toolbar first for natural tab order (toolbar → graph → other controls) */}
        <div className="fixed z-50 bottom-[max(0.75rem,env(safe-area-inset-bottom))] md:bottom-auto md:top-5 left-1/2 -translate-x-1/2 w-max max-w-[calc(100vw-2rem)] flex flex-col gap-2">
          {!isDesktop && (
            <MobileControls
              onUndo={execute.undo}
              onRedo={execute.redo}
              onDeleteSelectedNodes={execute.deleteSelectedNodes}
              onZoomIn={execute.zoomIn}
              onZoomOut={execute.zoomOut}
              onZoomReset={execute.resetZoom}
            />
          )}
          <MainToolbar graphRendererRef={graphRendererRef} />
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
                totalSteps={stepRun.ends.length}
                isPlaying={isPlaying}
                canStepBackward={canStepBackward}
                canStepForward={canStepForward}
                onJumpToStart={execute.jumpToStart}
                onStepBackward={execute.stepBackward}
                onStepForward={execute.stepForward}
                onJumpToEnd={execute.jumpToEnd}
                onTogglePlay={execute.togglePlay}
                onStop={execute.stopVisualization}
              />
            </m.div>
          )}
        </AnimatePresence>

        {/* Trace Panel - Desktop only, bottom center */}
        <AnimatePresence>
          {isInStepMode && tracePanelVisible && stepTrace && (
            <TracePanel
              trace={stepTrace}
              onCollapse={() => setTracePanelVisible(false)}
            />
          )}
        </AnimatePresence>

        {/* Full-screen Graph */}
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
        <div className="hidden md:flex fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40 gap-3">
          <Toolbar aria-label="Zoom controls">
            <ZoomControls
              onZoomIn={execute.zoomIn}
              onZoomOut={execute.zoomOut}
              onZoomReset={execute.resetZoom}
            />
          </Toolbar>

          <Toolbar aria-label="History controls">
            <IconAction label="Undo" side="top" disabled={!canUndo} onClick={execute.undo}>
              <Undo2 aria-hidden="true" />
            </IconAction>
            <IconAction label="Redo" side="top" disabled={!canRedo} onClick={execute.redo}>
              <Redo2 aria-hidden="true" />
            </IconAction>
          </Toolbar>
        </div>

        {/* Theme selector & keyboard shortcuts - Top left on mobile, bottom right on desktop */}
        {/* Below 450px the step controls span the top during a run and would only half cover it, so it hides */}
        <div className={`fixed top-[max(1rem,env(safe-area-inset-top))] left-[max(1rem,env(safe-area-inset-left))] md:top-auto md:left-auto md:bottom-[max(1rem,env(safe-area-inset-bottom))] md:right-[max(1rem,env(safe-area-inset-right))] z-40 gs-toolbar gs-panel ${isInStepMode ? "max-[450px]:hidden" : ""}`}>
          <AnimatePresence>
            {isInStepMode && !tracePanelVisible && (
              <TraceToggle onExpand={() => setTracePanelVisible(true)} />
            )}
          </AnimatePresence>
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
    </>
  );
};
