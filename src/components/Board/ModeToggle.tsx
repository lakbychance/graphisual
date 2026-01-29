import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { ToolbarToggleGroup, ToolbarToggleItem, ToolbarSeparator } from "../ui/toolbar";
import { VisualizationMode } from "../../constants/visualization";
import { useHasHover } from "../../hooks/useMediaQuery";

interface ModeToggleProps {
  mode: VisualizationMode;
  onModeChange: (mode: VisualizationMode) => void;
  disabled: boolean;
}

export const ModeToggle = ({ mode, onModeChange, disabled }: ModeToggleProps) => {
  const hasHover = useHasHover();

  return (
    <>
      <ToolbarToggleGroup
        type="single"
        value={mode}
        onValueChange={(value) => value && onModeChange(value as VisualizationMode)}
        disabled={disabled}
      >
        {hasHover ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1">
                <ToolbarToggleItem
                  value={VisualizationMode.AUTO}
                  className="px-2.5 py-1 text-xs w-full"
                >
                  Auto
                </ToolbarToggleItem>
              </span>
            </TooltipTrigger>
            <TooltipContent>Runs visualization automatically</TooltipContent>
          </Tooltip>
        ) : (
          <ToolbarToggleItem
            value={VisualizationMode.AUTO}
            className="px-2.5 py-1 text-xs"
          >
            Auto
          </ToolbarToggleItem>
        )}
        {hasHover ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="flex-1">
                <ToolbarToggleItem
                  value={VisualizationMode.MANUAL}
                  className="px-2.5 py-1 text-xs w-full"
                >
                  Step
                </ToolbarToggleItem>
              </span>
            </TooltipTrigger>
            <TooltipContent>Control each step manually</TooltipContent>
          </Tooltip>
        ) : (
          <ToolbarToggleItem
            value={VisualizationMode.MANUAL}
            className="px-2.5 py-1 text-xs"
          >
            Step
          </ToolbarToggleItem>
        )}
      </ToolbarToggleGroup>

      <ToolbarSeparator />
    </>
  );
};
