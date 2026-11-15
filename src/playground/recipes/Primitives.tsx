import { useState } from "react";
import { Bold, Italic, Underline, Download, Trash2 } from "lucide-react";
import {
  Button, Checkbox, Input, Kbd, Label, SegmentedControl, SegmentedControlItem, Slider, Stepper, Switch, Tabs, TabsList, TabsPanel,
  TabsTab, Toggle, ToggleGroup, ToggleIcon, Tooltip, TooltipContent, TooltipTrigger, Divider,
} from "@/components/ui-sdk";

/** Buttons: every variant and size, including a pending press. */
export function ButtonsDemo() {
  return (
    <div className="flex flex-col gap-3 items-start">
      <div className="flex flex-wrap gap-2 items-center">
        <Button>Default</Button>
        <Button variant="primary">Primary</Button>
        <Button variant="destructive">Destructive</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
      </div>
      <div className="flex flex-wrap gap-2 items-center">
        <Button size="sm">Small</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Download"><Download /></Button>
        <Button size="icon-sm" aria-label="Download"><Download /></Button>
        <Button size="icon-xs" aria-label="Download"><Download /></Button>
        <Button size="icon-sm" variant="ghost" tone="danger" aria-label="Delete"><Trash2 /></Button>
        <Button disabled>Disabled</Button>
        <Tooltip>
          <TooltipTrigger render={<Button variant="primary" size="sm" onClick={() => new Promise((r) => setTimeout(r, 1400))} />}>Async save</TooltipTrigger>
          <TooltipContent>Stays pending while the promise runs</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

/** Selection controls: toggle group, segmented control, switch, checkbox, tabs. */
export function SelectionDemo() {
  const [fmt, setFmt] = useState<string[]>(["bold"]);
  const [range, setRange] = useState<string | null>("week");
  const [on, setOn] = useState(true);
  const [checked, setChecked] = useState(true);
  return (
    <div className="flex flex-col gap-4 items-start">
      <div className="flex flex-wrap gap-4 items-center">
        <ToggleGroup multiple aria-label="Text formatting" value={fmt} onValueChange={setFmt}>
          <Toggle value="bold" aria-label="Bold"><ToggleIcon><Bold /></ToggleIcon></Toggle>
          <Toggle value="italic" aria-label="Italic"><ToggleIcon><Italic /></ToggleIcon></Toggle>
          <Toggle value="underline" aria-label="Underline" disabled><ToggleIcon><Underline /></ToggleIcon></Toggle>
        </ToggleGroup>
        <SegmentedControl aria-label="Range" value={range} onValueChange={setRange}>
          <SegmentedControlItem value="day">Day</SegmentedControlItem>
          <SegmentedControlItem value="week">Week</SegmentedControlItem>
          <SegmentedControlItem value="month">Month</SegmentedControlItem>
        </SegmentedControl>
      </div>
      <div className="flex flex-wrap gap-5 items-center">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Switch checked={on} onCheckedChange={setOn} aria-label="Directed" /> Directed
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <Checkbox checked={checked} onCheckedChange={(c) => setChecked(c === true)} aria-label="Weighted" /> Weighted
        </label>
        <label className="flex items-center gap-2 text-xs cursor-pointer opacity-70">
          <Checkbox disabled defaultChecked aria-label="Locked" /> Locked
        </label>
      </div>
      <Tabs defaultValue="templates" className="w-64">
        <TabsList aria-label="Generator mode">
          <TabsTab value="templates">Templates</TabsTab>
          <TabsTab value="custom">Custom</TabsTab>
          <TabsTab value="import" disabled>Import</TabsTab>
        </TabsList>
        <TabsPanel value="templates" className="gs-description">Eight ready-made graphs.</TabsPanel>
        <TabsPanel value="custom" className="gs-description">Nodes, density, weights.</TabsPanel>
      </Tabs>
    </div>
  );
}

/** Value controls: sliders, stepper with scrub label, text input, kbd. */
export function ValuesDemo() {
  const [nodes, setNodes] = useState(8);
  const [density, setDensity] = useState(45);
  const [weight, setWeight] = useState<number | null>(7);
  return (
    <div className="flex flex-col gap-4 w-72">
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline"><Label>Nodes</Label><span className="gs-value text-xs">{nodes}</span></div>
        <Slider variant="accent" min={3} max={15} value={nodes} onValueChange={(v) => setNodes(typeof v === "number" ? v : v[0])} thumbLabel="Nodes" ticks />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-baseline"><Label>Edge density</Label><span className="gs-value text-xs">{density}%</span></div>
        <Slider min={0} max={100} step={5} value={density} onValueChange={(v) => setDensity(typeof v === "number" ? v : v[0])} thumbLabel="Edge density" ticks />
      </div>
      <div className="flex gap-4 items-end">
        <Stepper label="Weight" scrubLabel={<Label>Weight · drag</Label>} value={weight} onValueChange={setWeight} min={-999} max={999} />
        <Divider className="self-center" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Label>Node label</Label>
          <Input defaultValue="A" maxLength={5} aria-label="Node label" />
        </div>
      </div>
      <div className="flex gap-2 items-center text-xs text-(--color-text-muted)">
        Shortcuts <Kbd>⌘</Kbd><Kbd>Z</Kbd> <Kbd>Space</Kbd> <Kbd>←</Kbd><Kbd>→</Kbd>
      </div>
    </div>
  );
}
