export interface AnimationSequenceOptions<T> {
  items: T[];
  delayMs: number;
  onStep: (item: T, index: number) => void;
  onComplete: () => void;
}

export interface AnimationController {
  cancel: () => void;
}

/**
 * Animates through a sequence of items with configurable delay.
 * Uses chained setTimeout - only one active timeout at a time.
 * Returns a controller to cancel the animation.
 */
export function animateSequence<T>(options: AnimationSequenceOptions<T>): AnimationController {
  const { items, delayMs, onStep, onComplete } = options;

  let cancelled = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const step = (index: number) => {
    if (cancelled) return;

    if (index >= items.length) {
      onComplete();
      return;
    }

    onStep(items[index], index);
    timeoutId = setTimeout(() => step(index + 1), delayMs);
  };

  // Start immediately
  step(0);

  return {
    cancel: () => {
      cancelled = true;
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    },
  };
}
