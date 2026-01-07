/**
 * Step-Through Controller Hook
 *
 * Manages algorithm step-through state including:
 * - Generator iterator management
 * - Step history for backward navigation
 * - Play/pause auto-advance
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { AlgorithmStep, AlgorithmGenerator } from '../algorithms/types';

export type StepMode = 'idle' | 'stepping' | 'playing';

export interface StepThroughState {
  /** All yielded steps (history for backward navigation) */
  steps: AlgorithmStep[];
  /** Current step index (-1 = not started, 0 = first step) */
  currentIndex: number;
  /** Whether the generator has been exhausted */
  isComplete: boolean;
  /** Current mode: idle, stepping, or auto-playing */
  mode: StepMode;
  /** Total steps known so far (may increase as generator advances) */
  totalSteps: number;
}

export interface StepThroughActions {
  /** Initialize with a new generator */
  start: (generator: AlgorithmGenerator) => AlgorithmStep | null;
  /** Advance to next step (may advance generator if needed) */
  next: () => AlgorithmStep | null;
  /** Go back to previous step */
  prev: () => AlgorithmStep | null;
  /** Jump to a specific step index */
  jumpTo: (index: number) => void;
  /** Jump to start (index 0) */
  jumpToStart: () => void;
  /** Jump to end (exhausts generator) */
  jumpToEnd: () => void;
  /** Start auto-play */
  play: () => void;
  /** Pause auto-play */
  pause: () => void;
  /** Reset to initial state */
  reset: () => void;
  /** Get step at specific index (for replay) */
  getStep: (index: number) => AlgorithmStep | null;
}

const initialState: StepThroughState = {
  steps: [],
  currentIndex: -1,
  isComplete: false,
  mode: 'idle',
  totalSteps: 0,
};

/**
 * Hook for managing step-through algorithm visualization.
 *
 * @param speed - Delay in ms between auto-play steps
 * @param onStep - Callback when a step is applied (for visualization)
 * @param onComplete - Callback when algorithm completes
 */
export function useStepThrough(
  speed: number = 400,
  onStep?: (step: AlgorithmStep, index: number) => void,
  onComplete?: () => void
): [StepThroughState, StepThroughActions] {
  const [state, setState] = useState<StepThroughState>(initialState);

  // Store generator in ref to persist across renders
  const generatorRef = useRef<AlgorithmGenerator | null>(null);
  const playIntervalRef = useRef<number | null>(null);

  // Clear play interval on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current !== null) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, []);

  // Start with a new generator
  const start = useCallback((generator: AlgorithmGenerator): AlgorithmStep | null => {
    // Clear any existing play interval
    if (playIntervalRef.current !== null) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }

    generatorRef.current = generator;
    setState({
      steps: [],
      currentIndex: -1,
      isComplete: false,
      mode: 'stepping',
      totalSteps: 0,
    });

    // Advance to first step
    const result = generator.next();
    if (result.done) {
      setState((prev) => ({ ...prev, isComplete: true }));
      return null;
    }

    const step = result.value;
    setState((prev) => ({
      ...prev,
      steps: [step],
      currentIndex: 0,
      totalSteps: 1,
    }));

    onStep?.(step, 0);
    return step;
  }, [onStep]);

  // Advance to next step
  const next = useCallback((): AlgorithmStep | null => {
    const { currentIndex, steps, isComplete } = state;

    // If we can read from history
    if (currentIndex < steps.length - 1) {
      const newIndex = currentIndex + 1;
      const step = steps[newIndex];
      setState((prev) => ({ ...prev, currentIndex: newIndex }));
      onStep?.(step, newIndex);
      return step;
    }

    // Need to advance the generator
    if (!isComplete && generatorRef.current) {
      const result = generatorRef.current.next();

      if (result.done) {
        setState((prev) => ({ ...prev, isComplete: true }));
        onComplete?.();
        return null;
      }

      const step = result.value;
      const newIndex = steps.length;
      setState((prev) => ({
        ...prev,
        steps: [...prev.steps, step],
        currentIndex: newIndex,
        totalSteps: newIndex + 1,
      }));
      onStep?.(step, newIndex);
      return step;
    }

    // Already complete
    if (isComplete) {
      onComplete?.();
    }
    return null;
  }, [state, onStep, onComplete]);

  // Go back to previous step
  const prev = useCallback((): AlgorithmStep | null => {
    const { currentIndex, steps } = state;

    if (currentIndex <= 0) return null;

    const newIndex = currentIndex - 1;
    const step = steps[newIndex];
    setState((prev) => ({ ...prev, currentIndex: newIndex }));
    return step;
  }, [state]);

  // Jump to specific index
  const jumpTo = useCallback((index: number) => {
    const { steps, isComplete } = state;

    // Clamp to valid range
    if (index < 0) index = 0;

    // If jumping beyond known steps, need to advance generator
    while (index >= steps.length && !isComplete && generatorRef.current) {
      const result = generatorRef.current.next();
      if (result.done) {
        setState((prev) => ({ ...prev, isComplete: true }));
        break;
      }
      setState((prev) => ({
        ...prev,
        steps: [...prev.steps, result.value],
        totalSteps: prev.steps.length + 1,
      }));
    }

    // Now set the index (clamped to available steps)
    setState((prev) => ({
      ...prev,
      currentIndex: Math.min(index, prev.steps.length - 1),
    }));
  }, [state]);

  // Jump to start
  const jumpToStart = useCallback(() => {
    if (state.steps.length === 0) return;
    setState((prev) => ({ ...prev, currentIndex: 0 }));
  }, [state.steps.length]);

  // Jump to end (exhaust generator)
  const jumpToEnd = useCallback(() => {
    // Exhaust the generator
    while (!state.isComplete && generatorRef.current) {
      const result = generatorRef.current.next();
      if (result.done) {
        setState((prev) => ({ ...prev, isComplete: true }));
        break;
      }
      setState((prev) => ({
        ...prev,
        steps: [...prev.steps, result.value],
        totalSteps: prev.steps.length + 1,
      }));
    }

    // Jump to last step
    setState((prev) => ({
      ...prev,
      currentIndex: prev.steps.length - 1,
    }));
    onComplete?.();
  }, [state.isComplete, onComplete]);

  // Start auto-play
  const play = useCallback(() => {
    if (playIntervalRef.current !== null) return; // Already playing

    setState((prev) => ({ ...prev, mode: 'playing' }));

    playIntervalRef.current = window.setInterval(() => {
      setState((currentState) => {
        const { currentIndex, steps, isComplete } = currentState;

        // If we can read from history
        if (currentIndex < steps.length - 1) {
          const newIndex = currentIndex + 1;
          const step = steps[newIndex];
          onStep?.(step, newIndex);
          return { ...currentState, currentIndex: newIndex };
        }

        // Need to advance the generator
        if (!isComplete && generatorRef.current) {
          const result = generatorRef.current.next();

          if (result.done) {
            // Stop playing when done
            if (playIntervalRef.current !== null) {
              clearInterval(playIntervalRef.current);
              playIntervalRef.current = null;
            }
            onComplete?.();
            return { ...currentState, isComplete: true, mode: 'stepping' };
          }

          const step = result.value;
          const newIndex = steps.length;
          onStep?.(step, newIndex);
          return {
            ...currentState,
            steps: [...steps, step],
            currentIndex: newIndex,
            totalSteps: newIndex + 1,
          };
        }

        // Already complete, stop playing
        if (playIntervalRef.current !== null) {
          clearInterval(playIntervalRef.current);
          playIntervalRef.current = null;
        }
        onComplete?.();
        return { ...currentState, mode: 'stepping' };
      });
    }, speed);
  }, [speed, onStep, onComplete]);

  // Pause auto-play
  const pause = useCallback(() => {
    if (playIntervalRef.current !== null) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setState((prev) => ({ ...prev, mode: 'stepping' }));
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    if (playIntervalRef.current !== null) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    generatorRef.current = null;
    setState(initialState);
  }, []);

  // Get step at index
  const getStep = useCallback((index: number): AlgorithmStep | null => {
    if (index < 0 || index >= state.steps.length) return null;
    return state.steps[index];
  }, [state.steps]);

  const actions: StepThroughActions = {
    start,
    next,
    prev,
    jumpTo,
    jumpToStart,
    jumpToEnd,
    play,
    pause,
    reset,
    getStep,
  };

  return [state, actions];
}
