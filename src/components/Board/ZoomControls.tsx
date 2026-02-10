import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ToolbarButton } from "../ui/toolbar";
import { ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";
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
          <ToolbarButton asChild>
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
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>Zoom Out</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton asChild>
            <Button
              onClick={onZoomReset}
              variant="ghost"
              size="icon-xs"
              aria-label="Reset zoom"
              className="min-w-10 relative z-10"
            >
              {Math.round(zoom * 100)}%
            </Button>
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>Reset Zoom</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <ToolbarButton asChild>
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
          </ToolbarButton>
        </TooltipTrigger>
        <TooltipContent>Zoom In</TooltipContent>
      </Tooltip>
    </>
  );
};
