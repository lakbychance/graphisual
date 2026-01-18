import { useCallback, useEffect, useRef, MutableRefObject } from "react";
import { useGraphStore, selectStepIndex, selectStepHistory, selectIsStepComplete } from "../store/graphStore";
import { isModKey } from "../utility/keyboard";
import { ZOOM } from "../utility/constants";

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
  playIntervalRef: MutableRefObject<number | null>;
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
  const zoom = useGraphStore((state) => state.zoom);
  const selectedNodeId = useGraphStore((state) => state.selectedNodeId);
  const canUndo = useGraphStore((state) => state.canUndo());
  const canRedo = useGraphStore((state) => state.canRedo());
  const visualizationState = useGraphStore((state) => state.visualization.state);
  const visualizationMode = useGraphStore((state) => state.visualization.mode);
  const stepIndex = useGraphStore(selectStepIndex);
  const stepHistory = useGraphStore(selectStepHistory);
  const isStepComplete = useGraphStore(selectIsStepComplete);
  const visualizationSpeed = useGraphStore((state) => state.visualization.speed);

  // Derived state
  const isVisualizing = visualizationState === "running";
  const isInStepMode = visualizationMode === "manual" && isVisualizing && stepHistory.length > 0;

  // Store actions
  const undo = useGraphStore((state) => state.undo);
  const redo = useGraphStore((state) => state.redo);
  const deleteNode = useGraphStore((state) => state.deleteNode);
  const selectNode = useGraphStore((state) => state.selectNode);
  const setZoom = useGraphStore((state) => state.setZoom);
  const stepForward = useGraphStore((state) => state.stepForward);
  const stepBackward = useGraphStore((state) => state.stepBackward);
  const jumpToStep = useGraphStore((state) => state.jumpToStep);
  const resetStepThrough = useGraphStore((state) => state.resetStepThrough);

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

  const executeDeleteSelectedNode = useCallback(() => {
    if (selectedNodeId !== null && !isVisualizing) {
      deleteNode(selectedNodeId);
    }
  }, [selectedNodeId, isVisualizing, deleteNode]);

  const executeZoomIn = useCallback(() => {
    setZoom(Math.min(zoom + ZOOM.STEP, ZOOM.MAX));
  }, [zoom, setZoom]);

  const executeZoomOut = useCallback(() => {
    setZoom(Math.max(zoom - ZOOM.STEP, ZOOM.MIN));
  }, [zoom, setZoom]);

  const executeResetZoom = useCallback(() => {
    setZoom(1);
  }, [setZoom]);

  const executeDeselect = useCallback(() => {
    if (!isInStepMode) {
      selectNode(null);
    }
  }, [isInStepMode, selectNode]);

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
        const stepComplete = vis.mode === 'manual' ? vis.step.isComplete : false;
        const stepIdx = vis.mode === 'manual' ? vis.step.index : -1;
        const stepHist = vis.mode === 'manual' ? vis.step.history : [];
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
  const actions: Record<string, GraphAction> = {
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
    deleteSelectedNode: {
      execute: executeDeleteSelectedNode,
      enabled: selectedNodeId !== null && !isVisualizing,
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
      enabled: !isInStepMode,
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
  };

  // Keyboard handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
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

        // Handle Escape specially - step mode takes precedence
        if (e.key === "Escape") {
          if (isInStepMode) {
            if (preventDefault) e.preventDefault();
            actions.stopVisualization.execute();
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
        const normalActions = ["undo", "redo", "deleteSelectedNode"];
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
    },
    [actions, isInStepMode]
  );

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
