import { useState } from "react";
import { Info, Workflow } from "lucide-react";
import {
  CardButton, Popover, PopoverContent, PopoverTrigger, Tabs, TabsList, TabsPanel, TabsTab,
  ToolbarButton, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { algorithmRegistry } from "@/algorithms";

interface SelectedOption {
  key: string;
  text: string;
}

interface AlgorithmPickerProps {
  selectedAlgo: SelectedOption | undefined;
  onSelect: (key: string) => void;
  disabled?: boolean;
}

type TabCategory = "traversal" | "pathfinding";
const CATEGORIES: TabCategory[] = ["traversal", "pathfinding"];

/** Algorithm picker: a toolbar button opening tabs of selectable cards. */
export const AlgorithmPicker = ({ selectedAlgo, onSelect, disabled }: AlgorithmPickerProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabCategory>("traversal");

  const selectedAlgorithm = selectedAlgo ? algorithmRegistry.get(selectedAlgo.key) : null;
  const TriggerIcon = selectedAlgorithm?.metadata.icon ?? Workflow;

  const handleSelect = (algoId: string) => {
    onSelect(algoId);
    setOpen(false);
  };

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <ToolbarButton
        render={<PopoverTrigger />}
        variant="default"
        size="sm"
        disabled={disabled}
        aria-label="Select algorithm"
        className="w-auto md:min-w-[11rem]"
      >
        <TriggerIcon className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline">{selectedAlgo ? selectedAlgo.text : "Algorithm"}</span>
      </ToolbarButton>
      <PopoverContent align="center" sideOffset={12} className="w-[320px]" aria-label="Choose an algorithm">
        <Tabs value={activeTab} onValueChange={(value) => value && setActiveTab(value as TabCategory)}>
          <TabsList aria-label="Algorithm category">
            <TabsTab value="traversal">Traversal</TabsTab>
            <TabsTab value="pathfinding">Pathfinding</TabsTab>
          </TabsList>
          {CATEGORIES.map((category) => (
            <TabsPanel key={category} value={category} className="grid grid-cols-2 gap-3">
              {algorithmRegistry.getByCategory(category).map((algo) => {
                const { metadata } = algo;
                const Icon = metadata.icon;
                return (
                  <div key={metadata.id} className="relative flex">
                    <CardButton
                      className="w-full p-3"
                      selected={selectedAlgo?.key === metadata.id}
                      icon={<Icon className="h-6 w-6" />}
                      title={metadata.name}
                      subtitle={metadata.tagline}
                      onClick={() => handleSelect(metadata.id)}
                    />
                    {metadata.landing !== false && (
                      <Tooltip>
                        <TooltipTrigger
                          render={<a href={`/algorithm/${metadata.id}`} target="_blank" rel="noopener noreferrer" />}
                          className="gs-button absolute top-1.5 right-1.5 z-10"
                          data-variant="ghost"
                          data-size="icon-xs"
                          data-tone="muted"
                          aria-label={`Learn more about ${metadata.name}`}
                        >
                          <Info aria-hidden="true" />
                        </TooltipTrigger>
                        <TooltipContent side="top">Learn more</TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                );
              })}
            </TabsPanel>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
