import { ZoomIn, ZoomOut } from "lucide-react";
import { ToolbarButton, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";
import { IconAction } from "../ui/icon-action";
import { ZOOM } from "../../constants/ui";
import { useGraphStore } from "../../store/graphStore";

interface ZoomControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
}

export const ZoomControls = ({ onZoomIn, onZoomOut, onZoomReset }: ZoomControlsProps) => {
  const zoom = useGraphStore((state) => state.viewport.zoom);

  return (
    <>
      <IconAction label="Zoom out" side="top" disabled={zoom <= ZOOM.MIN} onClick={onZoomOut}>
        <ZoomOut aria-hidden="true" />
      </IconAction>
      <Tooltip>
        <TooltipTrigger render={<ToolbarButton size="icon-sm" className="min-w-11 gs-value text-xs" aria-label="Reset zoom" onClick={onZoomReset} />}>
          {Math.round(zoom * 100)}%
        </TooltipTrigger>
        <TooltipContent side="top">Reset zoom</TooltipContent>
      </Tooltip>
      <IconAction label="Zoom in" side="top" disabled={zoom >= ZOOM.MAX} onClick={onZoomIn}>
        <ZoomIn aria-hidden="true" />
      </IconAction>
    </>
  );
};
