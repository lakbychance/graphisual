import {
  Slider as UISlider,
  SliderControl,
  SliderIndicator,
  SliderThumb,
  SliderTrack,
  SliderValue,
} from "@ui-sdk/react/slider";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export interface SliderProps extends ComponentProps<typeof UISlider> {
  /** `accent` colours the thumb with the form accent; `default` keeps it a plain puck. */
  variant?: "default" | "accent";
  /** Draw tick marks under the track, one per `step` (capped at 24). */
  ticks?: boolean;
  /** Show the formatted value beside the track. */
  showValue?: boolean;
  thumbLabel: string;
}

/**
 * Slider — etched groove, filled indicator, grip-lined thumb.
 * ui-sdk renders a real `<input type="range">` inside the thumb, so focus
 * styling uses `:has(:focus-visible)` and phones adjust it with screen-reader
 * gestures.
 */
export function Slider({
  variant = "default",
  ticks = false,
  showValue = false,
  thumbLabel,
  className,
  min = 0,
  max = 100,
  step = 1,
  ...props
}: SliderProps) {
  const tickCount = ticks ? Math.min(24, Math.round((max - min) / step)) : 0;
  return (
    <UISlider
      data-variant={variant}
      className={cn("gs-slider", className as string)}
      min={min}
      max={max}
      step={step}
      {...props}
    >
      <SliderControl className="gs-slider-control">
        <SliderTrack className="gs-slider-track">
          <SliderIndicator className="gs-slider-indicator" />
          <SliderThumb className="gs-slider-thumb" aria-label={thumbLabel}>
            <span className="gs-slider-grip" aria-hidden="true" />
          </SliderThumb>
        </SliderTrack>
        {tickCount > 0 && (
          <span className="gs-slider-ticks" aria-hidden="true">
            {Array.from({ length: tickCount + 1 }, (_, i) => (
              <span key={i} data-major={i % 5 === 0 || i === tickCount || undefined} />
            ))}
          </span>
        )}
      </SliderControl>
      {showValue && <SliderValue className="gs-slider-value" />}
    </UISlider>
  );
}
