import { Toggle, ToggleGroup, Tooltip, TooltipContent, TooltipTrigger, ToolbarSeparator } from "@/components/ui-sdk";
import { VisualizationMode } from "../../constants/visualization";

interface ModeToggleProps {
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  disabled: boolean;
}

/**
 * Auto / Step mode switch. A toggle group inside the toolbar joins its arrow-key
 * navigation (arrows move focus, Space/Enter press) instead of adding a tab stop;
 * `deselectable={false}` keeps one mode always on.
 */
export const ModeToggle = ({ mode, onModeChange, disabled }: ModeToggleProps) => {
  return (
    <>
      <ToggleGroup
        aria-label="Visualization mode"
        value={[mode]}
        deselectable={false}
        onValueChange={([value]) => value && onModeChange(value as VisualizationMode)}
        disabled={disabled}
      >
        <Tooltip>
          <TooltipTrigger render={<Toggle value={VisualizationMode.AUTO} />}>Auto</TooltipTrigger>
          <TooltipContent>Runs visualization automatically</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Toggle value={VisualizationMode.MANUAL} />}>Step</TooltipTrigger>
          <TooltipContent>Control each step manually</TooltipContent>
        </Tooltip>
      </ToggleGroup>
      <ToolbarSeparator />
    </>
  );
};
