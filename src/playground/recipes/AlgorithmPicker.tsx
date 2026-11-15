import { useState } from "react";
import { Info, Workflow } from "lucide-react";
import {
  Button, CardButton, Popover, PopoverContent, PopoverTrigger, Tabs, TabsList, TabsPanel, TabsTab,
  ToolbarButton, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { algorithmRegistry } from "@/algorithms";

type Category = "traversal" | "pathfinding";

interface AlgorithmPickerProps {
  value: string | null;
  onChange: (id: string) => void;
  disabled?: boolean;
  /** Render as a toolbar item (joins arrow-key navigation) or a standalone button. */
  inToolbar?: boolean;
}

/**
 * Algorithm picker: a popover holding tabs of selectable cards.
 * ui-sdk: Popover (modal, returns focus to the trigger), Tabs with a sliding
 * indicator, Tooltip on the info links.
 */
export function AlgorithmPicker({ value, onChange, disabled, inToolbar = true }: AlgorithmPickerProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Category>("traversal");
  const selected = value ? algorithmRegistry.get(value) : undefined;
  const TriggerIcon = selected?.metadata.icon ?? Workflow;

  const trigger = inToolbar ? (
    <ToolbarButton render={<PopoverTrigger />} variant="default" size="sm" disabled={disabled} className="md:min-w-[11rem]">
      <TriggerIcon className="h-4 w-4" />
      <span>{selected ? selected.metadata.name : "Algorithm"}</span>
    </ToolbarButton>
  ) : (
    <Button render={<PopoverTrigger />} size="sm" disabled={disabled}>
      <TriggerIcon className="h-4 w-4" />
      <span>{selected ? selected.metadata.name : "Algorithm"}</span>
    </Button>
  );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      {trigger}
      <PopoverContent side="bottom" align="center" sideOffset={12} className="w-[320px]" aria-label="Choose an algorithm">
        <Tabs value={tab} onValueChange={(v) => v && setTab(v as Category)}>
          <TabsList aria-label="Algorithm category">
            <TabsTab value="traversal">Traversal</TabsTab>
            <TabsTab value="pathfinding">Pathfinding</TabsTab>
          </TabsList>
          {(["traversal", "pathfinding"] as Category[]).map((cat) => (
            <TabsPanel key={cat} value={cat} className="grid grid-cols-2 gap-3">
              {algorithmRegistry.getByCategory(cat).map((algo) => {
                const Icon = algo.metadata.icon;
                return (
                  <div key={algo.metadata.id} className="relative flex">
                    <CardButton
                      className="w-full p-3"
                      selected={value === algo.metadata.id}
                      icon={<Icon className="h-6 w-6" />}
                      title={algo.metadata.name}
                      subtitle={algo.metadata.tagline}
                      onClick={() => { onChange(algo.metadata.id); setOpen(false); }}
                    />
                    <Tooltip>
                      <TooltipTrigger
                        render={<a href={`/algorithm/${algo.metadata.id}`} target="_blank" rel="noopener noreferrer" />}
                        className="gs-button absolute top-1.5 right-1.5 z-10"
                        data-variant="ghost"
                        data-size="icon-xs"
                        data-tone="muted"
                      >
                        <Info aria-hidden="true" />
                      </TooltipTrigger>
                      <TooltipContent side="top">Learn more</TooltipContent>
                    </Tooltip>
                  </div>
                );
              })}
            </TabsPanel>
          ))}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
