import { Minus, Plus } from "lucide-react";
import { ToolbarGroup, ToolbarSeparator, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";
import { IconAction } from "../ui/icon-action";

interface SpeedControlProps {
  speedMultiplier: string;
  disabled: boolean;
  canDecrease: boolean;
  canIncrease: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}

export const SpeedControl = ({ speedMultiplier, disabled, canDecrease, canIncrease, onDecrease, onIncrease }: SpeedControlProps) => {
  return (
    <>
      <ToolbarSeparator />
      <ToolbarGroup aria-label="Speed control" className="gap-1">
        <IconAction label="Decrease speed" tip="Slower" size="icon-sm" disabled={disabled || !canDecrease} onClick={onDecrease}>
          <Minus aria-hidden="true" />
        </IconAction>
        <Tooltip>
          <TooltipTrigger render={<span className="gs-value text-xs min-w-8 text-center cursor-help" />}>{speedMultiplier}</TooltipTrigger>
          <TooltipContent>Visualization speed</TooltipContent>
        </Tooltip>
        <IconAction label="Increase speed" tip="Faster" size="icon-sm" disabled={disabled || !canIncrease} onClick={onIncrease}>
          <Plus aria-hidden="true" />
        </IconAction>
      </ToolbarGroup>
    </>
  );
};
