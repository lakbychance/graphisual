import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { RadixToggleGroup, RadixToggleGroupItem } from "../ui/toggle-group";
import { VisualizationMode } from "../../constants";

interface ModeToggleProps {
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  disabled: boolean;
}

export const ModeToggle = ({ mode, onModeChange, disabled }: ModeToggleProps) => {
  return (
    <>
      <RadixToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => value && onModeChange(value as VisualizationMode)}
        variant="pressed"
        disabled={disabled}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1">
              <RadixToggleGroupItem
                value={VisualizationMode.AUTO}
                className="px-2.5 py-1 text-[12px] w-full"
              >
                Auto
              </RadixToggleGroupItem>
            </span>
          </TooltipTrigger>
          <TooltipContent>Runs visualization automatically</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="flex-1">
              <RadixToggleGroupItem
                value={VisualizationMode.MANUAL}
                className="px-2.5 py-1 text-[12px] w-full"
              >
                Step
              </RadixToggleGroupItem>
            </span>
          </TooltipTrigger>
          <TooltipContent>Control each step manually</TooltipContent>
        </Tooltip>
      </RadixToggleGroup>

      <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />
    </>
  );
};
