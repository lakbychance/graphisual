import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../tabs";
import { Button } from "../button";
import { ToolbarButton } from "../toolbar";
import { cn } from "../../../lib/utils";
import { useGraphStore } from "../../../store/graphStore";
import { type GeneratedGraph } from "../../../utils/graph/graphGenerator";
import { TemplatesTab } from "./templates-tab";
import { CustomGeneratorForm } from "./custom-generator-form";

interface GraphGeneratorProps {
  disabled?: boolean;
}

export const GraphGenerator = ({ disabled }: GraphGeneratorProps) => {
  const [open, setOpen] = useState(false);
  const setGraph = useGraphStore((state) => state.setGraph);

  const handleGenerate = (result: GeneratedGraph) => {
    setGraph(result.nodes, result.edges, result.nodeCounter);
    setOpen(false);
  };

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <ToolbarButton asChild>
          <Button
            disabled={disabled}
            aria-label="Generate graph"
            className={cn(
              "w-auto md:w-[110px] gap-1.5",
              "justify-center"
            )}
            size='sm'
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">Generate</span>
          </Button>
        </ToolbarButton>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="center"
        sideOffset={12}
      >
        <Tabs defaultValue="templates">
          <div className="p-2 border-b border-[var(--color-divider)]">
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </div>

          <div className="p-3">
            <TabsContent value="templates">
              <TemplatesTab onGenerate={handleGenerate} />
            </TabsContent>

            <TabsContent value="custom">
              <CustomGeneratorForm onGenerate={handleGenerate} />
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
