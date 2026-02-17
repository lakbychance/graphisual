import { useState, useCallback } from "react";
import { Workflow, Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { CardButton } from "./card-button";
import { ToolbarButton } from "./toolbar";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { cn } from "../../lib/utils";
import { algorithmRegistry, type AlgorithmAdapter } from "../../algorithms";

interface SelectedOption {
  key: string;
  text: string;
}

interface AlgorithmPickerProps {
  selectedAlgo: SelectedOption | undefined;
  onSelect: (key: string) => void;
  disabled?: boolean;
}

interface AlgorithmCardProps {
  algorithm: AlgorithmAdapter;
  selected: boolean;
  onClick: () => void;
}

type TabCategory = "traversal" | "pathfinding";

const AlgorithmCard = ({ algorithm, selected, onClick }: AlgorithmCardProps) => {
  const { metadata } = algorithm;
  const Icon = metadata.icon;

  return (
    <div className="relative flex">
      <CardButton
        onClick={onClick}
        selected={selected}
        rounded="md"
        className="p-3 w-full"
      >
        <Icon className="w-6 h-6 text-[var(--color-text-muted)]" />
        <span className="font-semibold text-sm text-[var(--color-text)]">
          {metadata.name}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] text-center leading-tight">
          {metadata.tagline}
        </span>
      </CardButton>
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            href={`/algorithm/${metadata.id}`}
            className="focus-ring-animated absolute top-1.5 right-1.5 z-20 p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Info className="w-3.5 h-3.5" />
          </a>
        </TooltipTrigger>
        <TooltipContent side="top">Learn more</TooltipContent>
      </Tooltip>
    </div>
  );
};

export const AlgorithmPicker = ({
  selectedAlgo,
  onSelect,
  disabled,
}: AlgorithmPickerProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabCategory>("traversal");

  // Get the selected algorithm's icon, or fall back to Workflow
  const selectedAlgorithm = selectedAlgo ? algorithmRegistry.get(selectedAlgo.key) : null;
  const TriggerIcon = selectedAlgorithm?.metadata.icon ?? Workflow;

  // Handle algorithm selection
  const handleSelect = useCallback((algoId: string) => {
    onSelect(algoId);
    setOpen(false);
  }, [onSelect]);

  // Get algorithms for a category
  const getAlgorithms = (category: TabCategory) => {
    return algorithmRegistry.getByCategory(category);
  };

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton asChild>
          <Button
            disabled={disabled}
            aria-label="Select algorithm"
            className={cn(
              "w-auto gap-1.5",
              "justify-center",
              "md:min-w-[11rem]"
            )}
            size="sm"
          >
            <TriggerIcon className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">
              {selectedAlgo ? selectedAlgo.text : "Algorithm"}
            </span>
          </Button>
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-[320px] p-3"
        align="center"
        sideOffset={12}
      >
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as TabCategory)}
        >
          <TabsList className="mb-3">
            <TabsTrigger value="traversal">Traversal</TabsTrigger>
            <TabsTrigger value="pathfinding">Pathfinding</TabsTrigger>
          </TabsList>

          {(['traversal', 'pathfinding'] as TabCategory[]).map((algoType) => (
            <TabsContent key={algoType} value={algoType} className="grid grid-cols-2 gap-3">
              {getAlgorithms(algoType).map((algo) => (
                <AlgorithmCard
                  key={algo.metadata.id}
                  algorithm={algo}
                  selected={selectedAlgo?.key === algo.metadata.id}
                  onClick={() => handleSelect(algo.metadata.id)}
                />
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
