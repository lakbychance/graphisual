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
}
