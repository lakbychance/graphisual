import { useState } from "react";
import { Shuffle, Sparkles } from "lucide-react";
import {
  Button, CardButton, Checkbox, Label, Popover, PopoverContent, PopoverTrigger, SegmentedControl, SegmentedControlItem,
  Slider, Stepper, Switch, Tabs, TabsList, TabsPanel, TabsTab, ToolbarButton,
} from "@/components/ui-sdk";
import { TEMPLATES } from "./mock";
import { TemplateGlyph } from "./IconAction";

type Layout = "circular" | "random" | "grid";

interface GraphGeneratorProps {
  disabled?: boolean;
  inToolbar?: boolean;
  /** `switches` swaps the Directed/Weighted checkboxes for switches — a second instance of the same form. */
  booleans?: "checkboxes" | "switches";
}

/**
 * Graph generator: popover → tabs → template tiles or a custom form.
 * ui-sdk: SegmentedControl (layout), Slider with value, Checkbox/Switch,
 * NumberInput steppers whose labels are scrub areas.
 */
export function GraphGenerator({ disabled, inToolbar = true, booleans = "checkboxes" }: GraphGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState<Layout>("circular");
  const [nodes, setNodes] = useState(6);
  const [density, setDensity] = useState(40);
  const [directed, setDirected] = useState(false);
  const [weighted, setWeighted] = useState(true);
  const [minW, setMinW] = useState<number | null>(1);
  const [maxW, setMaxW] = useState<number | null>(10);

  const trigger = inToolbar ? (
    <ToolbarButton render={<PopoverTrigger />} variant="default" size="sm" disabled={disabled} className="md:w-[110px]">
      <Sparkles className="h-4 w-4" />
      <span>Generate</span>
    </ToolbarButton>
  ) : (
    <Button render={<PopoverTrigger />} size="sm" disabled={disabled}>
      <Sparkles className="h-4 w-4" />
      <span>Generate</span>
    </Button>
  );

  const Bool = ({ id, label, checked, onChange }: { id: string; label: string; checked: boolean; onChange: (v: boolean) => void }) =>
    booleans === "switches" ? (
      <label className="flex items-center gap-2 cursor-pointer text-xs">
        <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
        <span>{label}</span>
      </label>
    ) : (
      <label htmlFor={id} className="flex items-center gap-2 cursor-pointer text-xs">
        <Checkbox id={id} checked={checked} onCheckedChange={(c) => onChange(c === true)} />
        <span>{label}</span>
      </label>
    );

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      {trigger}
      <PopoverContent side="bottom" align="center" sideOffset={12} className="w-[300px] p-0" aria-label="Generate a graph">
        <Tabs defaultValue="templates">
          <div className="p-2 border-b border-(--color-divider)">
            <TabsList aria-label="Generator mode">
              <TabsTab value="templates">Templates</TabsTab>
              <TabsTab value="custom">Custom</TabsTab>
            </TabsList>
          </div>
          <div className="p-3">
            <TabsPanel value="templates" className="grid grid-cols-3 gap-3">
              {TEMPLATES.map((t) => (
                <CardButton
                  key={t.id}
                  data-icon="lg"
                  icon={<TemplateGlyph nodes={t.nodes} edges={t.edges} />}
                  title={t.name}
                  onClick={() => setOpen(false)}
                />
              ))}
            </TabsPanel>
            <TabsPanel value="custom" className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label>Layout</Label>
                <SegmentedControl aria-label="Layout" value={layout} onValueChange={(v) => v && setLayout(v as Layout)} className="w-full">
                  <SegmentedControlItem value="circular">Circular</SegmentedControlItem>
                  <SegmentedControlItem value="random">Random</SegmentedControlItem>
                  <SegmentedControlItem value="grid">Grid</SegmentedControlItem>
                </SegmentedControl>
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <Label>Nodes</Label>
                  <span className="gs-value text-xs">{nodes}</span>
                </div>
                <Slider variant="accent" min={3} max={15} step={1} value={nodes} onValueChange={(v) => setNodes(typeof v === "number" ? v : v[0])} thumbLabel="Node count" ticks />
              </div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-baseline">
                  <Label>Edge density</Label>
                  <span className="gs-value text-xs">{density}%</span>
                </div>
                <Slider variant="accent" min={0} max={100} step={5} value={density} onValueChange={(v) => setDensity(typeof v === "number" ? v : v[0])} thumbLabel="Edge density" ticks />
              </div>
              <div className="flex gap-5">
                <Bool id="gen-directed" label="Directed" checked={directed} onChange={setDirected} />
                <Bool id="gen-weighted" label="Weighted" checked={weighted} onChange={setWeighted} />
              </div>
              {weighted && (
                <div className="flex gap-3">
                  <Stepper label="Minimum weight" scrubLabel={<Label>Min weight</Label>} value={minW} onValueChange={setMinW} min={1} max={(maxW ?? 10) - 1} className="flex-1" controlClassName="w-full" />
                  <Stepper label="Maximum weight" scrubLabel={<Label>Max weight</Label>} value={maxW} onValueChange={setMaxW} min={(minW ?? 1) + 1} max={999} className="flex-1" controlClassName="w-full" />
                </div>
              )}
              <Button className="w-full" onClick={() => new Promise((r) => setTimeout(r, 600)).then(() => setOpen(false))}>
                <Shuffle className="h-4 w-4" />
                Generate graph
              </Button>
            </TabsPanel>
          </div>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
