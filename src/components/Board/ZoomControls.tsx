import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { MOD_KEY } from "../../utility/keyboard";
import { ZOOM } from "../../constants/ui";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export const ZoomControls = ({ zoom, onZoomIn, onZoomOut, onZoomReset }: ZoomControlsProps) => {
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onZoomOut}
            disabled={zoom <= ZOOM.MIN}
            variant="ghost"
            size="icon-sm"
            className="relative z-10"
            aria-label="Zoom out"
          >
            <ZoomOut className={cn("h-4 w-4", zoom > ZOOM.MIN ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom Out ({MOD_KEY}−)</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onZoomReset}
            aria-label="Reset zoom"
            className="px-2 py-1 text-xs rounded-md hover:bg-[var(--color-interactive-hover)] transition-colors min-w-[44px] relative z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50 text-[var(--color-text)]"
          >
            {Math.round(zoom * 100)}%
          </button>
        </TooltipTrigger>
        <TooltipContent>Reset Zoom</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={onZoomIn}
            disabled={zoom >= ZOOM.MAX}
            variant="ghost"
            size="icon-sm"
            className="relative z-10"
            aria-label="Zoom in"
          >
            <ZoomIn className={cn("h-4 w-4", zoom < ZOOM.MAX ? "text-[var(--color-text)]" : "text-[var(--color-text-muted)]")} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom In ({MOD_KEY}+)</TooltipContent>
      </Tooltip>
    </>
  );
};
