import { SegmentedControl, SegmentedControlItem, Tooltip, TooltipContent, TooltipTrigger, ToolbarSeparator } from "@/components/ui-sdk";
import { VisualizationMode } from "../../constants/visualization";

interface ModeToggleProps {
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  disabled: boolean;
}

/** Auto / Step mode switch: a segmented control whose raised indicator slides. */
export const ModeToggle = ({ mode, onModeChange, disabled }: ModeToggleProps) => {
  return (
    <>
      <SegmentedControl
        aria-label="Visualization mode"
        value={mode}
        onValueChange={(value) => value && onModeChange(value as VisualizationMode)}
        disabled={disabled}
      >
        <Tooltip>
          <TooltipTrigger render={<SegmentedControlItem value={VisualizationMode.AUTO} />}>Auto</TooltipTrigger>
          <TooltipContent>Runs visualization automatically</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<SegmentedControlItem value={VisualizationMode.MANUAL} />}>Step</TooltipTrigger>
          <TooltipContent>Control each step manually</TooltipContent>
        </Tooltip>
      </SegmentedControl>
      <ToolbarSeparator />
    </>
  );
};
