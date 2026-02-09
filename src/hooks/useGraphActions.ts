import { useCallback, useEffect, useRef, RefObject } from "react";
import { useGraphStore, selectStepIndex, selectStepHistory, selectIsStepComplete } from "../store/graphStore";
import { isModKey } from "../utils/keyboard";
import { isElementInPopup } from "../utils/dom";
import { ZOOM } from "../constants/ui";
import { VisualizationState, VisualizationMode } from "../constants/visualization";

interface ShortcutConfig {
  key: string | string[];
  modKey?: boolean;
  shiftKey?: boolean;
  preventDefault?: boolean;
}

interface GraphAction {
  execute: () => void;
  enabled: boolean;
  shortcut?: ShortcutConfig;
}

interface PlayState {
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playIntervalRef: RefObject<number | null>;
}

interface UseGraphActionsOptions {
  playState?: PlayState;
}

export function useGraphActions(options: UseGraphActionsOptions = {}): {
  actions: Record<string, GraphAction>;
  handleKeyDown: (e: KeyboardEvent) => void;
} {
  const { playState } = options;

  // Store selectors
  const zoom = useGraphStore((state) => state.viewport.zoom);
  const hasSelectedNodes = useGraphStore((state) => state.selection.nodeIds.size > 0);
  const canUndo = useGraphStore((state) => state.canUndo());
  const canRedo = useGraphStore((state) => state.canRedo());
  const visualizationState = useGraphStore((state) => state.visualization.state);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const visualizationAlgorithm = useGraphStore((state) => state.visualization.algorithm);
  const stepIndex = useGraphStore(selectStepIndex);
  const stepHistory = useGraphStore(selectStepHistory);
  const isStepComplete = useGraphStore(selectIsStepComplete);
  const visualizationSpeed = useGraphStore((state) => state.visualization.speed);

  // Derived state for algorithm selection
  const isAlgorithmSelected = visualizationAlgorithm?.key != null && visualizationAlgorithm.key !== 'select';

  // Derived state
  const isVisualizing = visualizationState === VisualizationState.RUNNING;
  const isInStepMode = visualizationMode === VisualizationMode.MANUAL && isVisualizing && stepHistory.length > 0;

  // Store actions
  const undo = useGraphStore((state) => state.undo);
  const redo = useGraphStore((state) => state.redo);
  const deleteNodes = useGraphStore((state) => state.deleteNodes);
  const selectNode = useGraphStore((state) => state.selectNode);
  const setViewportZoom = useGraphStore((state) => state.setViewportZoom);
  const setViewportPan = useGraphStore((state) => state.setViewportPan);
  const stepForward = useGraphStore((state) => state.stepForward);
  const stepBackward = useGraphStore((state) => state.stepBackward);
  const jumpToStep = useGraphStore((state) => state.jumpToStep);
  const resetStepThrough = useGraphStore((state) => state.resetStepThrough);
  const setVisualizationAlgorithm = useGraphStore((state) => state.setVisualizationAlgorithm);

  // Stable refs for play state to avoid recreating callbacks
  const playStateRef = useRef(playState);
  playStateRef.current = playState;

  // Action executors
  const executeUndo = useCallback(() => {
    if (canUndo && !isVisualizing) {
      undo();
    }
  }, [canUndo, isVisualizing, undo]);

  const executeRedo = useCallback(() => {
    if (canRedo && !isVisualizing) {
      redo();
    }
  }, [canRedo, isVisualizing, redo]);

  const executeDeleteSelectedNodes = useCallback(() => {
    if (hasSelectedNodes && !isVisualizing) {
      // Get current selection from store and delete all at once
      const nodeIds = Array.from(useGraphStore.getState().selection.nodeIds);
      deleteNodes(nodeIds);
    }
  }, [hasSelectedNodes, isVisualizing, deleteNodes]);

  const executeZoomIn = useCallback(() => {
    setViewportZoom(Math.min(zoom + ZOOM.STEP, ZOOM.MAX));
  }, [zoom, setViewportZoom]);

  const executeZoomOut = useCallback(() => {
    setViewportZoom(Math.max(zoom - ZOOM.STEP, ZOOM.MIN));
  }, [zoom, setViewportZoom]);

  const executeResetZoom = useCallback(() => {
    setViewportZoom(1);
    setViewportPan(0, 0);
  }, [setViewportZoom, setViewportPan]);

  const executeDeselect = useCallback(() => {
    if (!isInStepMode) {
      selectNode(null);
    }
  }, [isInStepMode, selectNode]);

  const executeClearAlgorithm = useCallback(() => {
    if (isAlgorithmSelected && !isVisualizing) {
      setVisualizationAlgorithm(undefined);
    }
  }, [isAlgorithmSelected, isVisualizing, setVisualizationAlgorithm]);

  const executeStepForward = useCallback(() => {
    if (isInStepMode && !isStepComplete) {
      stepForward();
    }
  }, [isInStepMode, isStepComplete, stepForward]);

  const executeStepBackward = useCallback(() => {
    if (isInStepMode && stepIndex > 0) {
      stepBackward();
    }
  }, [isInStepMode, stepIndex, stepBackward]);

  const executeJumpToStart = useCallback(() => {
    if (isInStepMode && stepIndex > 0) {
      jumpToStep(0);
    }
  }, [isInStepMode, stepIndex, jumpToStep]);

  const executeJumpToEnd = useCallback(() => {
    if (isInStepMode && !isStepComplete) {
      jumpToStep(stepHistory.length - 1);
    }
  }, [isInStepMode, isStepComplete, stepHistory.length, jumpToStep]);

  const executeTogglePlay = useCallback(() => {
    const ps = playStateRef.current;
    if (!ps || !isInStepMode) return;

    if (ps.isPlaying) {
      // Pause
      if (ps.playIntervalRef.current !== null) {
        clearInterval(ps.playIntervalRef.current);
        ps.playIntervalRef.current = null;
      }
      ps.setIsPlaying(false);
    } else if (!isStepComplete) {
      // Play
      ps.setIsPlaying(true);
      ps.playIntervalRef.current = window.setInterval(() => {
        const state = useGraphStore.getState();
        const vis = state.visualization;
        const stepComplete = vis.mode === VisualizationMode.MANUAL ? vis.step.isComplete : false;
        const stepIdx = vis.mode === VisualizationMode.MANUAL ? vis.step.index : -1;
        const stepHist = vis.mode === VisualizationMode.MANUAL ? vis.step.history : [];
        if (stepComplete || stepIdx >= stepHist.length - 1) {
          if (ps.playIntervalRef.current !== null) {
            clearInterval(ps.playIntervalRef.current);
            ps.playIntervalRef.current = null;
          }
          ps.setIsPlaying(false);
          return;
        }
        state.stepForward();
      }, visualizationSpeed);
    }
  }, [isInStepMode, isStepComplete, visualizationSpeed]);

  const executeStopVisualization = useCallback(() => {
    const ps = playStateRef.current;
    if (ps && ps.playIntervalRef.current !== null) {
      clearInterval(ps.playIntervalRef.current);
      ps.playIntervalRef.current = null;
    }
    if (ps) {
      ps.setIsPlaying(false);
    }
    resetStepThrough();
    const { resetVisualization, clearVisualization } = useGraphStore.getState();
    resetVisualization();
    clearVisualization();
  }, [resetStepThrough]);

  // Define all actions with their shortcuts
  const actions: Record<string, GraphAction> = ({
    undo: {
      execute: executeUndo,
      enabled: canUndo && !isVisualizing,
      shortcut: { key: "z", modKey: true, shiftKey: false, preventDefault: true },
    },
    redo: {
      execute: executeRedo,
      enabled: canRedo && !isVisualizing,
      shortcut: { key: ["z", "y"], modKey: true, shiftKey: true, preventDefault: true },
    },
    deleteSelectedNodes: {
      execute: executeDeleteSelectedNodes,
      enabled: hasSelectedNodes && !isVisualizing,
      shortcut: { key: ["Delete", "Backspace"], preventDefault: true },
    },
    zoomIn: {
      execute: executeZoomIn,
      enabled: zoom < ZOOM.MAX,
      shortcut: { key: ["+", "="], modKey: true, preventDefault: true },
    },
    zoomOut: {
      execute: executeZoomOut,
      enabled: zoom > ZOOM.MIN,
      shortcut: { key: "-", modKey: true, preventDefault: true },
    },
    resetZoom: {
      execute: executeResetZoom,
      enabled: true,
    },
    deselect: {
      execute: executeDeselect,
      enabled: !isInStepMode && !isAlgorithmSelected,
      shortcut: { key: "Escape" },
    },
    clearAlgorithm: {
      execute: executeClearAlgorithm,
      enabled: isAlgorithmSelected && !isVisualizing,
      shortcut: { key: "Escape" },
    },
    stepForward: {
      execute: executeStepForward,
      enabled: isInStepMode && !isStepComplete,
      shortcut: { key: ["ArrowRight", "l", "L"], preventDefault: true },
    },
    stepBackward: {
      execute: executeStepBackward,
      enabled: isInStepMode && stepIndex > 0,
      shortcut: { key: ["ArrowLeft", "h", "H"], preventDefault: true },
    },
    jumpToStart: {
      execute: executeJumpToStart,
      enabled: isInStepMode && stepIndex > 0,
      shortcut: { key: "Home", preventDefault: true },
    },
    jumpToEnd: {
      execute: executeJumpToEnd,
      enabled: isInStepMode && !isStepComplete,
      shortcut: { key: "End", preventDefault: true },
    },
    togglePlay: {
      execute: executeTogglePlay,
      enabled: isInStepMode && (playState?.isPlaying || !isStepComplete),
      shortcut: { key: " ", preventDefault: true },
    },
    stopVisualization: {
      execute: executeStopVisualization,
      enabled: isInStepMode,
      shortcut: { key: "Escape", preventDefault: true },
    },
  });

  // Keyboard handler
  const handleKeyDown =
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Ignore Escape if focus is inside a popup (dropdown, popover, dialog)
      if (e.key === "Escape" && isElementInPopup(e.target as Element)) {
        return;
      }

      // Check each action for matching shortcut
      for (const [actionName, action] of Object.entries(actions)) {
        if (!action.shortcut) continue;

        const { key, modKey, shiftKey, preventDefault } = action.shortcut;
        const keys = Array.isArray(key) ? key : [key];

        // Check if the key matches
        if (!keys.includes(e.key)) continue;

        // Check modifier key requirements
        if (modKey && !isModKey(e)) continue;
        if (modKey === false && isModKey(e)) continue;

        // Check shift key requirements
        // Special handling for redo: Cmd+Shift+Z or Cmd+Y
        if (actionName === "redo") {
          const isShiftZ = e.key === "z" && e.shiftKey;
          const isY = e.key === "y";
          if (!isShiftZ && !isY) continue;
        } else {
          if (shiftKey === true && !e.shiftKey) continue;
          if (shiftKey === false && e.shiftKey) continue;
        }

        // Handle Escape specially - priority: step mode > algorithm selected > deselect
        if (e.key === "Escape") {
          if (isInStepMode) {
            if (preventDefault) e.preventDefault();
            actions.stopVisualization.execute();
            return;
          } else if (isAlgorithmSelected && !isVisualizing) {
            if (preventDefault) e.preventDefault();
            actions.clearAlgorithm.execute();
            return;
          } else {
            if (preventDefault) e.preventDefault();
            actions.deselect.execute();
            return;
          }
        }

        // Step mode shortcuts only work in step mode
        const stepModeActions = [
          "stepForward",
          "stepBackward",
          "jumpToStart",
          "jumpToEnd",
          "togglePlay",
          "stopVisualization",
        ];
        if (stepModeActions.includes(actionName) && !isInStepMode) continue;

        // Non-step-mode shortcuts (undo, redo, delete, zoom) shouldn't work during step mode
        const normalActions = ["undo", "redo", "deleteSelectedNodes"];
        if (normalActions.includes(actionName) && isInStepMode) continue;

        // Execute the action if enabled
        if (action.enabled) {
          if (preventDefault) e.preventDefault();
          action.execute();
          return;
        } else if (preventDefault) {
          // Still prevent default for disabled actions to avoid browser behavior
          e.preventDefault();
          return;
        }
      }
    }
  return { actions, handleKeyDown };
}

/**
 * Hook to register keyboard shortcuts for graph actions.
 * Call this once in the component tree (e.g., in Board.tsx).
 */
export function useGraphKeyboardShortcuts(handleKeyDown: (e: KeyboardEvent) => void): void {
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
