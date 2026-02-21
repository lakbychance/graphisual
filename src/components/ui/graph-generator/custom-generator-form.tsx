import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Button } from "../button";
import { StepperInput } from "../stepper-input";
import { Slider } from "../slider";
import { Checkbox } from "../checkbox";
import { RadixToggleGroup, RadixToggleGroupItem } from "../toggle-group";
import {
  generateRandomGraph,
  type GeneratedGraph,
  type LayoutType,
} from "../../../utils/graph/graphGenerator";

interface CustomGeneratorFormProps {
  onGenerate: (result: GeneratedGraph) => void;
}

type FormState = {
  nodeCount: number;
  edgeDensity: number;
  isDirected: boolean;
  isWeighted: boolean;
  minWeight: number;
  maxWeight: number;
  layout: LayoutType;
};

const DEFAULT_STATE: FormState = {
  nodeCount: 6,
  edgeDensity: 0.4,
  isDirected: false,
  isWeighted: false,
  minWeight: 1,
  maxWeight: 10,
  layout: "circular",
};

export const CustomGeneratorForm = ({ onGenerate }: CustomGeneratorFormProps) => {
  const [form, setForm] = useState<FormState>(DEFAULT_STATE);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleGenerate = () => {
    onGenerate(generateRandomGraph({
      nodeCount: form.nodeCount,
      edgeDensity: form.edgeDensity,
      directed: form.isDirected,
      weighted: form.isWeighted,
      minWeight: form.minWeight,
      maxWeight: form.maxWeight,
      layout: form.layout,
    }));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <span className="text-xs text-[var(--color-text-muted)]">Layout</span>
        <RadixToggleGroup
          type="single"
          value={form.layout}
          onValueChange={(value) => value && set("layout", value as LayoutType)}
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

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Nodes</span>
          <span className="text-[var(--color-text)]">{form.nodeCount}</span>
        </div>
        <Slider
          variant="accent"
          min={3}
          max={15}
          step={1}
          value={[form.nodeCount]}
          onValueChange={([v]) => set("nodeCount", v)}
        />
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-[var(--color-text-muted)]">Edge Density</span>
          <span className="text-[var(--color-text)]">{Math.round(form.edgeDensity * 100)}%</span>
        </div>
        <Slider
          variant="accent"
          min={0}
          max={100}
          step={1}
          value={[form.edgeDensity * 100]}
          onValueChange={([v]) => set("edgeDensity", v / 100)}
        />
      </div>

      <div className="flex gap-4">
        <label htmlFor="gen-directed" className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            id="gen-directed"
            checked={form.isDirected}
            onCheckedChange={(checked) => set("isDirected", checked === true)}
          />
          <span className="text-xs text-[var(--color-text)]">
            Directed
          </span>
        </label>
        <label htmlFor="gen-weighted" className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            id="gen-weighted"
            checked={form.isWeighted}
            onCheckedChange={(checked) => set("isWeighted", checked === true)}
          />
          <span className="text-xs text-[var(--color-text)]">
            Weighted
          </span>
        </label>
      </div>

      {form.isWeighted && (
        <div className="flex gap-3">
          <div className="flex-1 space-y-1">
            <p className="text-xs text-[var(--color-text-muted)]">
              Min Weight
            </p>
            <StepperInput
              value={form.minWeight}
              onChange={(val) => set("minWeight", Math.max(1, Math.min(val, form.maxWeight - 1)))}
              min={1}
              max={form.maxWeight - 1}
            />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs text-[var(--color-text-muted)]">
              Max Weight
            </p>
            <StepperInput
              value={form.maxWeight}
              onChange={(val) => set("maxWeight", Math.max(form.minWeight + 1, Math.min(val, 999)))}
              min={form.minWeight + 1}
              max={999}
            />
          </div>
        </div>
      )}

      <Button
        onClick={handleGenerate}
        className="w-full gap-2"
      >
        <Shuffle className="w-4 h-4" />
        Generate Graph
      </Button>
    </div>
  );
};
