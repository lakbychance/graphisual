import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { RadixToggleGroup, RadixToggleGroupItem } from "../ui/toggle-group";
import { VisualizationMode } from "../../constants/visualization";
import { useHasHover } from "../../hooks/useMediaQuery";

interface ModeToggleProps {
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  disabled: boolean;
}

export const ModeToggle = ({ mode, onModeChange, disabled }: ModeToggleProps) => {
  const hasHover = useHasHover();

  const AutoItem = (
    <span className="flex-1">
      <RadixToggleGroupItem
        value={VisualizationMode.AUTO}
        className="px-2.5 py-1 text-xs w-full"
      >
        Auto
      </RadixToggleGroupItem>
    </span>
  );

  const StepItem = (
    <span className="flex-1">
      <RadixToggleGroupItem
        value={VisualizationMode.MANUAL}
        className="px-2.5 py-1 text-xs w-full"
      >
        Step
      </RadixToggleGroupItem>
    </span>
  );

  return (
    <>
      <RadixToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => value && onModeChange(value as VisualizationMode)}
        variant="pressed"
        disabled={disabled}
      >
        {hasHover ? (
          <Tooltip>
            <TooltipTrigger asChild>{AutoItem}</TooltipTrigger>
            <TooltipContent>Runs visualization automatically</TooltipContent>
          </Tooltip>
        ) : (
          AutoItem
        )}
        {hasHover ? (
          <Tooltip>
            <TooltipTrigger asChild>{StepItem}</TooltipTrigger>
            <TooltipContent>Control each step manually</TooltipContent>
          </Tooltip>
        ) : (
          StepItem
        )}
      </RadixToggleGroup>

      <div className="w-px h-7 mx-1 md:mx-2 bg-[var(--color-divider)]" />
    </>
  );
};
