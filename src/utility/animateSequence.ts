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
 * Returns a controller to cancel the animation.
 */
export function animateSequence<T>(options: AnimationSequenceOptions<T>): AnimationController {
  const { items, delayMs, onStep, onComplete } = options;
  const timeoutIds: ReturnType<typeof setTimeout>[] = [];

  for (let i = 0; i <= items.length; i++) {
    const timeoutId = setTimeout(() => {
      if (i === items.length) {
        onComplete();
      } else {
        onStep(items[i], i);
      }
    }, delayMs * i);
    timeoutIds.push(timeoutId);
  }

  return {
    cancel: () => timeoutIds.forEach(clearTimeout),
  };
}
