import { useState, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import "./skins.css";
import "./playground.css";
import { Button, SegmentedControl, SegmentedControlItem, Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui-sdk";
import { SKINS, type SkinId } from "./skins";
import { Stage } from "./Stage";
import { MainToolbar } from "./recipes/MainToolbar";
import { StepControls } from "./recipes/StepControls";
import { TracePanel } from "./recipes/TracePanel";
import { HistoryControls, ShortcutsPopover, ThemeMenu, ZoomControls } from "./recipes/CornerControls";
import { AlgorithmPicker } from "./recipes/AlgorithmPicker";
import { GraphGenerator } from "./recipes/GraphGenerator";
import { EdgePopupDemo, NodeLabelDemo } from "./recipes/EdgePopups";
import { AlgorithmHintDemo } from "./recipes/AlgorithmHint";
import { ButtonsDemo, SelectionDemo, ValuesDemo } from "./recipes/Primitives";
import { BFS_STEPS } from "./recipes/mock";

interface Section {
  id: string;
  title: string;
  maps: string;
  parts: string;
  render: () => ReactNode;
  /** Wider cards for wide components. */
  wide?: boolean;
}

function StepControlsDemo() {
  const [i, setI] = useState(2);
  const [playing, setPlaying] = useState(false);
  const last = BFS_STEPS.length - 1;
  return (
    <StepControls
      index={i} total={BFS_STEPS.length} playing={playing}
      onJumpStart={() => setI(0)} onPrev={() => setI((n) => Math.max(0, n - 1))} onNext={() => setI((n) => Math.min(last, n + 1))}
      onJumpEnd={() => setI(last)} onTogglePlay={() => setPlaying((p) => !p)} onDone={() => setPlaying(false)}
    />
  );
}

const SECTIONS: Section[] = [
  { id: "toolbar", title: "Main toolbar", maps: "Board/MainToolbar + ModeToggle + SpeedControl", parts: "Toolbar · SegmentedControl · Popover · Select · Menu · Tooltip", wide: true, render: () => <MainToolbar /> },
  { id: "step", title: "Step controls", maps: "Board/StepControls", parts: "Toolbar · ToolbarButton · Tooltip", render: () => <StepControlsDemo /> },
  { id: "trace", title: "Trace panel", maps: "Board/TracePanel + DataStructureVis", parts: "Panel · chips", render: () => <TracePanel step={BFS_STEPS[2]} onCollapse={() => {}} /> },
  { id: "algorithm", title: "Algorithm picker", maps: "ui/algorithm-picker", parts: "Popover · Tabs (indicator) · CardButton · Tooltip", render: () => <AlgorithmPicker value="dijkstra" onChange={() => {}} inToolbar={false} /> },
  { id: "generator", title: "Graph generator", maps: "ui/graph-generator (templates + custom form)", parts: "Popover · Tabs · SegmentedControl · Slider · Checkbox / Switch · NumberInput", render: () => (
      <div className="flex gap-3 flex-wrap justify-center">
        <GraphGenerator inToolbar={false} />
        <GraphGenerator inToolbar={false} booleans="switches" />
      </div>
    ) },
  { id: "edge", title: "Edge popup", maps: "Graph/EdgePopup", parts: "Popover (point anchor) · ToggleGroup · NumberInput · Tooltip", render: () => <EdgePopupDemo /> },
  { id: "label", title: "Node label popup", maps: "Graph/NodeLabelPopup", parts: "Popover (point anchor) · Input", render: () => <NodeLabelDemo /> },
  { id: "corners", title: "Corner controls", maps: "Board/ZoomControls · history · ThemeSelector · KeyboardShortcuts", parts: "Toolbar · Menu (radio group) · Popover · Kbd", render: () => (
      <div className="flex flex-col gap-3 items-center">
        <div className="flex gap-3"><ZoomControls /><HistoryControls /></div>
        <div className="gs-toolbar gs-panel"><ShortcutsPopover /><ThemeMenu /></div>
      </div>
    ) },
  { id: "hint", title: "Algorithm hint", maps: "Board/AlgorithmHint", parts: "status pill", render: () => <AlgorithmHintDemo /> },
  { id: "buttons", title: "Buttons", maps: "ui/button (all variants) + pending state", parts: "Button", wide: true, render: () => <ButtonsDemo /> },
  { id: "selection", title: "Selection controls", maps: "ui/toggle-group · tabs · checkbox (+ switch, segmented)", parts: "ToggleGroup · SegmentedControl · Switch · Checkbox · Tabs", render: () => <SelectionDemo /> },
  { id: "values", title: "Value controls", maps: "ui/slider · stepper-input · node label input", parts: "Slider · NumberInput (scrub) · Input · Kbd", render: () => <ValuesDemo /> },
];

const SKIN_IDS = new Set<string>(SKINS.map((s) => s.id));

/** `?view=stage&skin=blueprint` deep-links a view, so a specific skin can be shared or screenshotted. */
function readParams() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const skin = params.get("skin");
  return {
    view: params.get("view") === "stage" ? "stage" : "components",
    skin: skin && SKIN_IDS.has(skin) ? (skin as SkinId) : null,
  };
}

export default function ThemePlayground() {
  const [initial] = useState(readParams);
  const [filter, setFilter] = useState<"all" | SkinId>(initial.skin ?? "all");
  const [stageSkin, setStageSkin] = useState<SkinId>(initial.skin ?? "anodized");
  const skins = filter === "all" ? SKINS : SKINS.filter((s) => s.id === filter);

  return (
    <div className="pg-root">
      <header className="pg-header">
        <div className="pg-header-row">
          <Button variant="ghost" size="sm" tone="muted" render={<a href="/" />}>
            <ArrowLeft aria-hidden="true" /> Graphisual
          </Button>
          <h1 className="pg-title">Theme playground</h1>
          <span className="pg-sub">Every Graphisual control rebuilt on <a href="https://ui-sdk.dev" target="_blank" rel="noopener noreferrer">ui-sdk</a>, rendered in five skins. Everything is live.</span>
        </div>
      </header>

      <Tabs defaultValue={initial.view} className="pg-tabs">
        <div className="pg-controls">
          <TabsList aria-label="View" className="pg-view">
            <TabsTab value="components">Components</TabsTab>
            <TabsTab value="stage">Stage</TabsTab>
          </TabsList>
        </div>

        <TabsPanel value="components" className="pg-panel" keepMounted>
          <div className="pg-filter">
            <SegmentedControl aria-label="Skin filter" value={filter} onValueChange={(v) => v && setFilter(v as "all" | SkinId)} size="md">
              <SegmentedControlItem value="all">All skins</SegmentedControlItem>
              {SKINS.map((s) => <SegmentedControlItem key={s.id} value={s.id}>{s.name}</SegmentedControlItem>)}
            </SegmentedControl>
          </div>
          <div className="pg-layout">
            <nav className="pg-nav" aria-label="Components">
              {SECTIONS.map((s) => <a key={s.id} href={`#${s.id}`}>{s.title}</a>)}
            </nav>
            <div className="pg-sections">
              {SECTIONS.map((section) => (
                <section key={section.id} id={section.id} className="pg-section">
                  <header className="pg-section-head">
                    <h2>{section.title}</h2>
                    <p><span>Rebuilds</span> {section.maps}</p>
                    <p><span>ui-sdk</span> {section.parts}</p>
                  </header>
                  <div className="pg-grid" data-wide={section.wide || undefined} data-count={skins.length}>
                    {skins.map((skin) => (
                      <article key={skin.id} className="pg-card" data-skin={skin.id}>
                        <div className="pg-card-head">
                          <span className="pg-card-name">{skin.name}</span>
                          <span className="pg-swatches" aria-hidden="true">{skin.swatches.map((c) => <i key={c} style={{ background: c }} />)}</span>
                        </div>
                        <div className="pg-card-body">{section.render()}</div>
                        {filter !== "all" && <p className="pg-card-note">{skin.recipe}</p>}
                      </article>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </TabsPanel>

        <TabsPanel value="stage" className="pg-panel" keepMounted>
          <div className="pg-filter">
            <SegmentedControl aria-label="Stage skin" value={stageSkin} onValueChange={(v) => v && setStageSkin(v as SkinId)} size="md">
              {SKINS.map((s) => <SegmentedControlItem key={s.id} value={s.id}>{s.name}</SegmentedControlItem>)}
            </SegmentedControl>
            <p className="pg-stage-blurb">{SKINS.find((s) => s.id === stageSkin)?.tagline}</p>
          </div>
          <div data-skin={stageSkin} className="pg-stage-frame">
            <Stage key={stageSkin} />
          </div>
        </TabsPanel>
      </Tabs>
    </div>
  );
}
