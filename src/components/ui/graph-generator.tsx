import { useState } from "react";
import { Sparkles, Shuffle, GitBranch, Circle, Star, Grid3X3, ArrowDownRight, Scale } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";
import { Button } from "./button";
import { CardButton } from "./card-button";
import { StepperInput } from "./stepper-input";
import { Slider } from "./slider";
import { Checkbox } from "./checkbox";
import { RadixToggleGroup, RadixToggleGroupItem } from "./toggle-group";
import { cn } from "../../lib/utils";
import { useGraphStore } from "../../store/graphStore";
import {
  generateRandomGraph,
  generatePath,
  generateCycle,
  generateComplete,
  generateStar,
  generateBinaryTree,
  generateGrid,
  generateDAG,
  generateWeighted,
  type RandomGeneratorOptions,
  type LayoutType,
} from "../../utility/graphGenerator";

interface GraphGeneratorProps {
  disabled?: boolean;
}

interface TemplateConfig {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  generate: () => void;
}

export const GraphGenerator = ({ disabled }: GraphGeneratorProps) => {
  const [open, setOpen] = useState(false);

  // Custom generator state
  const [nodeCount, setNodeCount] = useState(6);
  const [edgeDensity, setEdgeDensity] = useState(0.4);
  const [isDirected, setIsDirected] = useState(false);
  const [isWeighted, setIsWeighted] = useState(false);
  const [minWeight, setMinWeight] = useState(1);
  const [maxWeight, setMaxWeight] = useState(10);
  const [layout, setLayout] = useState<LayoutType>("circular");

  const setGraph = useGraphStore((state) => state.setGraph);

  const handleGenerateCustom = () => {
    const options: RandomGeneratorOptions = {
      nodeCount,
      edgeDensity,
      directed: isDirected,
      weighted: isWeighted,
      minWeight,
      maxWeight,
      layout,
    };
    const { nodes, edges, nodeCounter } = generateRandomGraph(options);
    setGraph(nodes, edges, nodeCounter);
    setOpen(false);
  };

  const templates: TemplateConfig[] = [
    {
      id: "path",
      name: "Path",
      description: "Linear chain",
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="4" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="20" cy="12" r="2" />
          <line x1="6" y1="12" x2="10" y2="12" />
          <line x1="14" y1="12" x2="18" y2="12" />
        </svg>
      ),
      generate: () => {
        const { nodes, edges, nodeCounter } = generatePath(5);
        setGraph(nodes, edges, nodeCounter);
        setOpen(false);
      },
    },
    {
      id: "cycle",
      name: "Cycle",
      description: "Circular loop",
      icon: Circle,
      generate: () => {
        const { nodes, edges, nodeCounter } = generateCycle(6);
        setGraph(nodes, edges, nodeCounter);
        setOpen(false);
      },
    },
    {
      id: "complete",
      name: "Complete",
      description: "Fully connected",
      icon: ({ className }) => (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="4" r="2" />
          <circle cx="4" cy="12" r="2" />
          <circle cx="20" cy="12" r="2" />
          <circle cx="8" cy="20" r="2" />
          <circle cx="16" cy="20" r="2" />
          <line x1="12" y1="6" x2="4" y2="10" />
          <line x1="12" y1="6" x2="20" y2="10" />
          <line x1="12" y1="6" x2="8" y2="18" />
          <line x1="12" y1="6" x2="16" y2="18" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="4" y1="14" x2="8" y2="18" />
          <line x1="20" y1="14" x2="16" y2="18" />
          <line x1="10" y1="20" x2="14" y2="20" />
          <line x1="4" y1="14" x2="16" y2="18" />
          <line x1="20" y1="14" x2="8" y2="18" />
        </svg>
      ),
      generate: () => {
        const { nodes, edges, nodeCounter } = generateComplete(5);
        setGraph(nodes, edges, nodeCounter);
        setOpen(false);
      },
    },
    {
      id: "star",
      name: "Star",
      description: "Central hub",
      icon: Star,
      generate: () => {
        const { nodes, edges, nodeCounter } = generateStar(6);
        setGraph(nodes, edges, nodeCounter);
        setOpen(false);
      },
    },
    {
      id: "tree",
      name: "Tree",
      description: "Binary tree",
      icon: GitBranch,
      generate: () => {
        const { nodes, edges, nodeCounter } = generateBinaryTree(4);
        setGraph(nodes, edges, nodeCounter);
        setOpen(false);
      },
    },
    {
      id: "dag",
      name: "DAG",
      description: "Directed acyclic",
      icon: ArrowDownRight,
      generate: () => {
        const { nodes, edges, nodeCounter } = generateDAG(4, 2);
        setGraph(nodes, edges, nodeCounter);
        setOpen(false);
      },
    },
    {
      id: "grid",
      name: "Grid",
      description: "2D lattice",
      icon: Grid3X3,
      generate: () => {
        const { nodes, edges, nodeCounter } = generateGrid(3, 4);
        setGraph(nodes, edges, nodeCounter);
        setOpen(false);
      },
    },
    {
      id: "weighted",
      name: "Weighted",
      description: "For pathfinding",
      icon: Scale,
      generate: () => {
        const { nodes, edges, nodeCounter } = generateWeighted();
        setGraph(nodes, edges, nodeCounter);
        setOpen(false);
      },
    },
  ];

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          disabled={disabled}
          aria-label="Generate graph"
          className={cn(
            "w-auto md:w-[110px] transition-none h-9 !rounded-full gap-1.5",
            "justify-center"
          )}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="hidden md:inline">Generate</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[300px] p-0"
        align="center"
        sideOffset={8}
      >
        <Tabs defaultValue="templates">
          {/* Tab switcher */}
          <div className="p-2 border-b border-[var(--color-divider)]">
            <TabsList>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="custom">Custom</TabsTrigger>
            </TabsList>
          </div>

          {/* Content */}
          <div className="p-3">
            <TabsContent value="templates">
              <div className="grid grid-cols-3 gap-2">
                {templates.map((template) => (
                  <CardButton key={template.id} onClick={template.generate}>
                    <template.icon className="w-5 h-5 text-[var(--color-text-muted)]" />
                    <span className="font-semibold text-xs text-[var(--color-text)]">
                      {template.name}
                    </span>
                  </CardButton>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="custom">
              <div className="space-y-4">
                {/* Layout selector */}
                <div className="space-y-2">
                  <span className="text-xs text-[var(--color-text-muted)]">Layout</span>
                  <RadixToggleGroup
                    type="single"
                    value={layout}
                    onValueChange={(value) => value && setLayout(value as LayoutType)}
                    variant="etched"
                    className="w-full"
                  >
                    <RadixToggleGroupItem value="circular" className="text-xs">
                      Circular
                    </RadixToggleGroupItem>
                    <RadixToggleGroupItem value="random" className="text-xs">
                      Random
                    </RadixToggleGroupItem>
                    <RadixToggleGroupItem value="grid" className="text-xs">
                      Grid
                    </RadixToggleGroupItem>
                  </RadixToggleGroup>
                </div>

                {/* Node count */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Nodes</span>
                    <span className="text-[var(--color-text)]">{nodeCount}</span>
                  </div>
                  <Slider
                    variant="accent"
                    min={3}
                    max={15}
                    step={1}
                    value={[nodeCount]}
                    onValueChange={([v]) => setNodeCount(v)}
                  />
                </div>

                {/* Edge density */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-[var(--color-text-muted)]">Edge Density</span>
                    <span className="text-[var(--color-text)]">{Math.round(edgeDensity * 100)}%</span>
                  </div>
                  <Slider
                    variant="accent"
                    min={0}
                    max={100}
                    step={1}
                    value={[edgeDensity * 100]}
                    onValueChange={([v]) => setEdgeDensity(v / 100)}
                  />
                </div>

                {/* Toggles */}
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={isDirected}
                      onCheckedChange={(checked) => setIsDirected(checked === true)}
                    />
                    <span className="text-xs text-[var(--color-text)]">
                      Directed
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={isWeighted}
                      onCheckedChange={(checked) => setIsWeighted(checked === true)}
                    />
                    <span className="text-xs text-[var(--color-text)]">
                      Weighted
                    </span>
                  </label>
                </div>

                {/* Weight range (shown only if weighted) */}
                {isWeighted && (
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-[var(--color-text-muted)]">
                        Min Weight
                      </label>
                      <StepperInput
                        value={minWeight}
                        onChange={(val) => setMinWeight(Math.max(1, Math.min(val, maxWeight - 1)))}
                        min={1}
                        max={maxWeight - 1}
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-xs text-[var(--color-text-muted)]">
                        Max Weight
                      </label>
                      <StepperInput
                        value={maxWeight}
                        onChange={(val) => setMaxWeight(Math.max(minWeight + 1, Math.min(val, 999)))}
                        min={minWeight + 1}
                        max={999}
                      />
                    </div>
                  </div>
                )}

                {/* Generate button */}
                <Button
                  onClick={handleGenerateCustom}
                  className="w-full !rounded-full gap-2"
                >
                  <Shuffle className="w-4 h-4" />
                  Generate Graph
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};
