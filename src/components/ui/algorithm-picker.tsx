import { useState, useCallback } from "react";
import { Workflow } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Button } from "./button";
import { ToolbarButton } from "./toolbar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { GrainTexture } from "./grain-texture";
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
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-3 rounded-lg duration-100 overflow-hidden",
        "bg-[var(--color-surface)]",
        "focus:outline-none focus-ring-animated",
        selected
          ? "shadow-[var(--shadow-pressed)] ring-2 ring-[var(--color-text)]"
          : "shadow-[var(--shadow-raised),var(--highlight-edge)] hover:ring-2 hover:ring-[var(--color-text-muted)]"
      )}
    >
      <GrainTexture baseFrequency={4.2} className="rounded-lg" />
      <div className="relative z-10 flex flex-col items-center gap-1.5">
        <Icon className="w-6 h-6 text-[var(--color-text-muted)]" />
        <span className="font-semibold text-sm text-[var(--color-text)]">
          {metadata.name}
        </span>
        <span className="text-xs text-[var(--color-text-muted)] text-center leading-tight">
          {metadata.tagline}
        </span>
      </div>
    </button>
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
              "w-auto transition-none h-9 !rounded-lg gap-1.5",
              "justify-center",
              "md:min-w-[11rem]"
            )}
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
            <TabsContent value={algoType} className="grid grid-cols-2 gap-3">
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
