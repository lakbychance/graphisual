import { useCallback, useEffect } from "react";
import { useGraphStore } from "../store/graphStore";
import { isModKey } from "../utils/keyboard";
import { isElementInPopup } from "../utils/dom";
import { ZOOM } from "../constants/ui";
import { VisualizationState, VisualizationMode } from "../constants/visualization";

// ---------------------------------------------------------------------------
// Shortcut config — static, lives outside the hook, never recreated
// ---------------------------------------------------------------------------

interface ShortcutConfig {
  key: string | string[];
  modKey?: boolean;
  shiftKey?: boolean;
  preventDefault?: boolean;
}

const SHORTCUTS: Record<string, ShortcutConfig> = {
  undo:                { key: "z",                       modKey: true, shiftKey: false, preventDefault: true },
  redo:                { key: ["z", "y"],                modKey: true, shiftKey: true,  preventDefault: true },
  deleteSelectedNodes: { key: ["Delete", "Backspace"],                                  preventDefault: true },
  zoomIn:              { key: ["+", "="],                modKey: true,                  preventDefault: true },
  zoomOut:             { key: "-",                       modKey: true,                  preventDefault: true },
  stepForward:         { key: ["ArrowRight", "l", "L"],                                 preventDefault: true },
  stepBackward:        { key: ["ArrowLeft",  "h", "H"],                                 preventDefault: true },
  jumpToStart:         { key: "Home",                                                    preventDefault: true },
  jumpToEnd:           { key: "End",                                                     preventDefault: true },
  togglePlay:          { key: " ",                                                       preventDefault: true },
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGraphActions() {
  // All execute functions read from getState() at call time.
  // Deps are [] so they are stable for the lifetime of the component.

  const undo = useCallback(() => {
    const s = useGraphStore.getState();
    if (!s.canUndo() || s.visualization.state === VisualizationState.RUNNING) return;
    s.undo();
  }, []);

  const redo = useCallback(() => {
    const s = useGraphStore.getState();
    if (!s.canRedo() || s.visualization.state === VisualizationState.RUNNING) return;
    s.redo();
  }, []);

  const deleteSelectedNodes = useCallback(() => {
    const s = useGraphStore.getState();
    if (s.selection.nodeIds.size === 0 || s.visualization.state === VisualizationState.RUNNING) return;
    s.deleteNodes(Array.from(s.selection.nodeIds));
  }, []);

  const zoomIn = useCallback(() => {
    const s = useGraphStore.getState();
    s.setViewportZoom(Math.min(s.viewport.zoom + ZOOM.STEP, ZOOM.MAX));
  }, []);

  const zoomOut = useCallback(() => {
    const s = useGraphStore.getState();
    s.setViewportZoom(Math.max(s.viewport.zoom - ZOOM.STEP, ZOOM.MIN));
  }, []);

  const resetZoom = useCallback(() => {
    const s = useGraphStore.getState();
    s.setViewportZoom(1);
    s.setViewportPan(0, 0);
  }, []);

  const deselect = useCallback(() => {
    const s = useGraphStore.getState();
    const { visualization, selectNode } = s;
    const isInStepMode =
      visualization.mode === VisualizationMode.MANUAL &&
      visualization.state === VisualizationState.RUNNING &&
      visualization.step.history.length > 0;
    if (!isInStepMode) selectNode(null);
  }, []);

  const clearAlgorithm = useCallback(() => {
    const s = useGraphStore.getState();
    const { visualization, setVisualizationAlgorithm } = s;
    const isSelected = visualization.algorithm?.key != null && visualization.algorithm.key !== "select";
    if (isSelected && visualization.state !== VisualizationState.RUNNING) {
      setVisualizationAlgorithm(undefined);
    }
  }, []);

  const stepForward = useCallback(() => {
    const s = useGraphStore.getState();
    if (s.visualization.mode !== VisualizationMode.MANUAL) return;
    if (s.visualization.state !== VisualizationState.RUNNING) return;
    if (s.visualization.step.history.length === 0 || s.visualization.step.isComplete) return;
    s.stopAutoPlay();
    s.stepForward();
  }, []);

  const stepBackward = useCallback(() => {
    const s = useGraphStore.getState();
    if (s.visualization.mode !== VisualizationMode.MANUAL) return;
    if (s.visualization.state !== VisualizationState.RUNNING) return;
    if (s.visualization.step.history.length === 0 || s.visualization.step.index <= 0) return;
    s.stopAutoPlay();
    s.stepBackward();
  }, []);

  const jumpToStart = useCallback(() => {
    const s = useGraphStore.getState();
    if (s.visualization.mode !== VisualizationMode.MANUAL) return;
    if (s.visualization.state !== VisualizationState.RUNNING) return;
    if (s.visualization.step.history.length === 0 || s.visualization.step.index <= 0) return;
    s.stopAutoPlay();
    s.jumpToStep(0);
  }, []);

  const jumpToEnd = useCallback(() => {
    const s = useGraphStore.getState();
    if (s.visualization.mode !== VisualizationMode.MANUAL) return;
    if (s.visualization.state !== VisualizationState.RUNNING) return;
    if (s.visualization.step.history.length === 0 || s.visualization.step.isComplete) return;
    s.stopAutoPlay();
    s.jumpToStep(s.visualization.step.history.length - 1);
  }, []);

  const togglePlay = useCallback(() => {
    const s = useGraphStore.getState();
    if (s.visualization.mode !== VisualizationMode.MANUAL) return;
    if (s.visualization.state !== VisualizationState.RUNNING) return;
    if (s.visualization.step.history.length === 0) return;
    if (s.visualization.step.isAutoPlaying) {
      s.stopAutoPlay();
    } else if (!s.visualization.step.isComplete) {
      s.startAutoPlay();
    }
  }, []);

  const stopVisualization = useCallback(() => {
    const s = useGraphStore.getState();
    s.resetStepThrough();
    s.resetVisualization();
    s.clearVisualization();
  }, []);

  // -------------------------------------------------------------------------
  // Keyboard handler — stable with [] deps because all execute fns are stable
  // -------------------------------------------------------------------------

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (e.key === "Escape" && isElementInPopup(e.target as Element)) return;

    const { visualization } = useGraphStore.getState();
    const isVisualizing = visualization.state === VisualizationState.RUNNING;
    const isInStepMode =
      visualization.mode === VisualizationMode.MANUAL &&
      isVisualizing &&
      visualization.step.history.length > 0;
    const isAlgorithmSelected =
      visualization.algorithm?.key != null && visualization.algorithm.key !== "select";

    // Escape: priority — step mode > algorithm > deselect
    if (e.key === "Escape") {
      e.preventDefault();
      if (isInStepMode) stopVisualization();
      else if (isAlgorithmSelected && !isVisualizing) clearAlgorithm();
      else deselect();
      return;
    }

    const entries: Array<{
      fn: () => void;
      shortcut: ShortcutConfig;
      stepModeOnly?: boolean;
      isRedo?: boolean;
    }> = [
      { fn: undo,                shortcut: SHORTCUTS.undo },
      { fn: redo,                shortcut: SHORTCUTS.redo,           isRedo: true },
      { fn: deleteSelectedNodes, shortcut: SHORTCUTS.deleteSelectedNodes },
      { fn: zoomIn,              shortcut: SHORTCUTS.zoomIn },
      { fn: zoomOut,             shortcut: SHORTCUTS.zoomOut },
      { fn: stepForward,         shortcut: SHORTCUTS.stepForward,    stepModeOnly: true },
      { fn: stepBackward,        shortcut: SHORTCUTS.stepBackward,   stepModeOnly: true },
      { fn: jumpToStart,         shortcut: SHORTCUTS.jumpToStart,    stepModeOnly: true },
      { fn: jumpToEnd,           shortcut: SHORTCUTS.jumpToEnd,      stepModeOnly: true },
      { fn: togglePlay,          shortcut: SHORTCUTS.togglePlay,     stepModeOnly: true },
    ];

    for (const { fn, shortcut, stepModeOnly, isRedo } of entries) {
      // Step-mode-only shortcuts don't fire outside step mode
      if (stepModeOnly && !isInStepMode) continue;

      const { key, modKey, shiftKey, preventDefault } = shortcut;
      const keys = Array.isArray(key) ? key : [key];
      if (!keys.includes(e.key)) continue;
      if (modKey && !isModKey(e)) continue;
      if (modKey === false && isModKey(e)) continue;

      // Redo: Cmd+Shift+Z or Cmd+Y
      if (isRedo) {
        if (!(e.key === "z" && e.shiftKey) && e.key !== "y") continue;
      } else {
        if (shiftKey === true && !e.shiftKey) continue;
        if (shiftKey === false && e.shiftKey) continue;
      }

      if (preventDefault) e.preventDefault();
      fn();
      return;
    }
  }, [undo, redo, deleteSelectedNodes, zoomIn, zoomOut, stepForward, stepBackward, jumpToStart, jumpToEnd, togglePlay, stopVisualization, clearAlgorithm, deselect]);

  return {
    undo,
    redo,
    deleteSelectedNodes,
    zoomIn,
    zoomOut,
    resetZoom,
    deselect,
    clearAlgorithm,
    stepForward,
    stepBackward,
    jumpToStart,
    jumpToEnd,
    togglePlay,
    stopVisualization,
    handleKeyDown,
  };
}

/**
 * Registers the keyboard listener for graph actions.
 * Call this exactly once at the top of the component tree (Board.tsx).
 * handleKeyDown is stable, so the listener is registered once and never torn down.
 */
export function useGraphKeyboardShortcuts(handleKeyDown: (e: KeyboardEvent) => void): void {
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
