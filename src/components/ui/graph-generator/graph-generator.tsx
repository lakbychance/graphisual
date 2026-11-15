import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, Tabs, TabsList, TabsPanel, TabsTab, ToolbarButton } from "@/components/ui-sdk";
import { useGraphStore } from "../../../store/graphStore";
import { type GeneratedGraph } from "../../../utils/graph/graphGenerator";
import { TemplatesTab } from "./templates-tab";
import { CustomGeneratorForm } from "./custom-generator-form";

interface GraphGeneratorProps {
  disabled?: boolean;
}

/** Graph generator: popover with template tiles and a custom form. */
export const GraphGenerator = ({ disabled }: GraphGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const setGraph = useGraphStore((state) => state.setGraph);

  const handleGenerate = (result: GeneratedGraph) => {
    setGraph(result.nodes, result.edges, result.nodeCounter);
    setOpen(false);
  };

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <ToolbarButton
        render={<PopoverTrigger />}
        variant="default"
        size="sm"
        disabled={disabled}
        aria-label="Generate graph"
        className="w-auto md:w-[110px]"
      >
        <Sparkles className="h-4 w-4 shrink-0" />
        <span className="hidden md:inline">Generate</span>
      </ToolbarButton>
      <PopoverContent className="w-[300px] p-0" align="center" sideOffset={12} aria-label="Generate a graph">
        <Tabs defaultValue="templates" className="gap-0">
          <div className="p-2 border-b border-(--color-divider)">
            <TabsList aria-label="Generator mode">
              <TabsTab value="templates">Templates</TabsTab>
              <TabsTab value="custom">Custom</TabsTab>
            </TabsList>
          </div>
          <div className="p-3">
            <TabsPanel value="templates">
              <TemplatesTab onGenerate={handleGenerate} />
            </TabsPanel>
            <TabsPanel value="custom">
              <CustomGeneratorForm onGenerate={handleGenerate} />
            </TabsPanel>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
