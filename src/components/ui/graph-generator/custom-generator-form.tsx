import { useState } from "react";
import { Shuffle } from "lucide-react";
import { Button, Checkbox, Label, SegmentedControl, SegmentedControlItem, Slider, Stepper } from "@/components/ui-sdk";
import { generateRandomGraph, type GeneratedGraph, type LayoutType } from "../../../utils/graph/graphGenerator";

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

const single = (v: number | number[]) => (typeof v === "number" ? v : v[0]);

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
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label>Layout</Label>
        <SegmentedControl
          aria-label="Layout"
          value={form.layout}
          onValueChange={(value) => value && set("layout", value as LayoutType)}
          className="w-full"
        >
          <SegmentedControlItem value="circular">Circular</SegmentedControlItem>
          <SegmentedControlItem value="random">Random</SegmentedControlItem>
          <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
        </SegmentedControl>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <Label>Nodes</Label>
          <span className="gs-value text-xs">{form.nodeCount}</span>
        </div>
        <Slider variant="accent" min={3} max={15} step={1} value={form.nodeCount} onValueChange={(v) => set("nodeCount", single(v))} thumbLabel="Node count" ticks />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline">
          <Label>Edge density</Label>
          <span className="gs-value text-xs">{Math.round(form.edgeDensity * 100)}%</span>
        </div>
        <Slider variant="accent" min={0} max={100} step={5} value={Math.round(form.edgeDensity * 100)} onValueChange={(v) => set("edgeDensity", single(v) / 100)} thumbLabel="Edge density" ticks />
      </div>

      <div className="flex gap-5">
        <label htmlFor="gen-directed" className="flex items-center gap-2 cursor-pointer text-xs">
          <Checkbox id="gen-directed" checked={form.isDirected} onCheckedChange={(checked) => set("isDirected", checked === true)} />
          Directed
        </label>
        <label htmlFor="gen-weighted" className="flex items-center gap-2 cursor-pointer text-xs">
          <Checkbox id="gen-weighted" checked={form.isWeighted} onCheckedChange={(checked) => set("isWeighted", checked === true)} />
          Weighted
        </label>
      </div>

      {form.isWeighted && (
        <div className="flex gap-3">
          <Stepper
            label="Minimum weight"
            scrubLabel={<Label>Min weight</Label>}
            value={form.minWeight}
            onValueChange={(v) => v !== null && set("minWeight", Math.max(1, Math.min(v, form.maxWeight - 1)))}
            min={1}
            max={form.maxWeight - 1}
            className="flex-1"
            controlClassName="w-full"
          />
          <Stepper
            label="Maximum weight"
            scrubLabel={<Label>Max weight</Label>}
            value={form.maxWeight}
            onValueChange={(v) => v !== null && set("maxWeight", Math.max(form.minWeight + 1, Math.min(v, 999)))}
            min={form.minWeight + 1}
            max={999}
            className="flex-1"
            controlClassName="w-full"
          />
        </div>
      )}

      <Button onClick={handleGenerate} className="w-full">
        <Shuffle className="h-4 w-4" />
        Generate graph
      </Button>
    </div>
  );
};
