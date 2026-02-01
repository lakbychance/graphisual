/**
 * Visualization-related constants and enums.
 * Used for discriminated unions in store and type narrowing in algorithms.
 */

export enum VisualizationState {
  IDLE = 'idle',
  RUNNING = 'running',
  DONE = 'done',
}

export enum VisualizationMode {
  AUTO = 'auto',
  MANUAL = 'manual',
}

export enum StepType {
  VISIT = 'visit',
  RESULT = 'result',
  CYCLE = 'cycle',
}

// Speed levels for visualization (multiplier display with actual ms delay)
export const SPEED_LEVELS = [
  { multiplier: '0.5x', ms: 800 },
  { multiplier: '1x', ms: 400 },
  { multiplier: '2x', ms: 200 },
  { multiplier: '4x', ms: 100 },
] as const;
