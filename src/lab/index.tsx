/**
 * Rework lab (`/rework-lab`): live variants of the run UI (state on the graph, the notebook, the
 * timeline) for the owner to compare. Real renderer (SVG), real themes, the shared engine.
 * Dev server and Vercel previews only (see `__REWORK_LAB__` in vite.config.ts).
 *
 * The URL carries the moment (`?v=&algorithm=&g=&from=&to=&step=`, see `model.ts`) and follows
 * the learner, so any moment in any variant can be linked.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, KeyRound, Shapes } from "lucide-react";
import { useShallow } from "zustand/shallow";
import "./lab.css";
import {
  Button, Menu, MenuContent, MenuGroup, MenuGroupLabel, MenuItemIndicator, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger,
  Panel, Popover, PopoverContent, PopoverTrigger, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { Graph } from "@/components/Graph/Graph";
import { ThemeSelector } from "@/components/Board/ThemeSelector";
import { VisualizationMode } from "@/constants/visualization";
import { useAutoPlay } from "@/hooks/useAutoPlay";
import { useGraphActions } from "@/hooks/useGraphActions";
import { useIsDesktop } from "@/hooks/useMediaQuery";
import { selectIsPlaying, selectStepIndex, selectStepRun, useGraphStore } from "@/store/graphStore";
import { useSettingsStore } from "@/store/settingsStore";
import { canvasLayers } from "./CanvasState";
import {
  algorithmInfo, graphChoices, LAB_ALGORITHMS, readSetup, setupLink, stepView, summarise, VARIANTS, type VariantId,
} from "./model";
import { Transport } from "./parts";
import { CANVAS, Caption, Notebook, Score, VariantSwitch, occlusion, type VariantProps } from "./variants";

const VARIANT_VIEW: Record<VariantId, (props: VariantProps) => React.ReactNode> = { caption: Caption, notebook: Notebook, score: Score };

/** Pause between steps while playing (ms). */
const PLAY_SPEED = 900;

export default function ReworkLab() {
  // The run part of the URL; stepping only rewrites the URL, so it never rebuilds the run.
  const [query, setQuery] = useState(() => window.location.search);
  const result = useMemo(() => readSetup(query), [query]);
  const setup = "setup" in result ? result.setup : null;
  const [variant, setVariant] = useState<VariantId>(() => setup?.variant ?? "caption");
  const graphCode = new URLSearchParams(query).get("graph");

  const desktop = useIsDesktop();
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const index = useGraphStore(selectStepIndex);
  const run = useGraphStore(selectStepRun);
  const playing = useGraphStore(selectIsPlaying);
  const nodes = useGraphStore(useShallow((s) => s.data.nodes));
  const edges = useGraphStore((s) => s.data.edges);
  const zoom = useGraphStore((s) => s.viewport.zoom);
  const execute = useGraphActions();
  useAutoPlay();

  // Play the setup in the app's own store, as a step-mode run.
  useEffect(() => {
    if (!setup) return;
    const store = useGraphStore.getState();
    store.clearVisualization();
    store.setVisualizationAlgorithm({ key: setup.algorithm, text: algorithmInfo(setup.algorithm).name });
    store.setVisualizationMode(VisualizationMode.MANUAL);
    store.setVisualizationSpeed(PLAY_SPEED);
    store.setGraph(setup.graph.nodes, setup.graph.edges, setup.graph.nodeCounter);
    store.setVisualizationInput({ startNodeId: setup.from, endNodeId: setup.to ?? -1 });
    store.startVisualization(setup.run);
    store.jumpToStep(setup.step - 1);
  }, [setup]);

  // The URL follows the variant and the step.
  const loaded = setup !== null && run === setup.run && index >= 0;
  useEffect(() => {
    if (!setup || !loaded) return;
    window.history.replaceState(null, "", setupLink({ ...setup, variant }, index + 1, graphCode));
  }, [setup, loaded, variant, index, graphCode]);

  // Fit the graph into the room the variant's panels leave.
  const [size, setSize] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const onResize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  useEffect(() => {
    if (!setup) return;
    const room = occlusion(variant, desktop, size.h);
    const xs = setup.graph.nodes.map((n) => n.x);
    const ys = setup.graph.nodes.map((n) => n.y);
    const pad = 44;
    const bw = Math.max(...xs) - Math.min(...xs) + pad * 2;
    const bh = Math.max(...ys) - Math.min(...ys) + pad * 2;
    const w = size.w - room.left - room.right;
    const h = size.h - room.top - room.bottom;
    const z = Math.max(0.4, Math.min(1.25, w / bw, h / bh));
    const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
    const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
    // The graph's centre goes to the middle of the free room.
    const store = useGraphStore.getState();
    store.setViewportZoom(z);
    store.setViewportPan(-cx + (room.left - room.right) / 2 / z, -cy + (room.top - room.bottom) / 2 / z);
  }, [setup, variant, desktop, size]);

  // Arrow keys, Home / End and Space move through the run.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as Element | null;
      if (target?.closest?.("input, textarea, [role='slider'], [role='menu'], [role='listbox']")) return;
      if (e.key === " " && target?.closest?.("button, a[href]")) return;
      const action = { ArrowRight: execute.stepForward, ArrowLeft: execute.stepBackward, Home: execute.jumpToStart, End: execute.jumpToEnd, " ": execute.togglePlay }[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [execute]);

  const summary = useMemo(() => (loaded ? summarise(run, nodes) : null), [loaded, run, nodes]);
  const view = loaded ? stepView(run, index, nodes) : null;

  const navigate = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams({ v: variant, algorithm: setup?.algorithm ?? "dijkstra" });
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) params.delete(key);
      else params.set(key, value);
    }
    window.history.replaceState(null, "", `/rework-lab?${params}`);
    setQuery(`?${params}`);
  };

  const transport = {
    index: Math.max(0, index),
    total: run.ends.length,
    playing,
    onStart: execute.jumpToStart,
    onPrev: execute.stepBackward,
    onNext: execute.stepForward,
    onEnd: execute.jumpToEnd,
    onPlay: execute.togglePlay,
  };
  const onScrub = (i: number) => {
    const store = useGraphStore.getState();
    store.stopAutoPlay();
    store.jumpToStep(i);
  };

  const info = setup ? algorithmInfo(setup.algorithm) : null;
  const VariantView = VARIANT_VIEW[variant];

  return (
    <main className="lab-root" data-variant={variant}>
      <div className="absolute inset-0 pointer-events-none canvas-surface" />
      <div className="absolute inset-0 touch-action-manipulation">
        <Graph layers={view ? canvasLayers({ view, nodes, edges, options: CANVAS[variant], zoom }) : undefined} />
      </div>

      <header className="lab-bar">
        <div className="gs-toolbar gs-panel lab-bar-group">
          {desktop && (
            <Button variant="ghost" size="sm" tone="muted" render={<a href="/" />}>
              <ArrowLeft aria-hidden="true" /> Lab
            </Button>
          )}
          <VariantSwitch value={variant} onChange={setVariant} variants={VARIANTS} size={desktop ? "md" : "sm"} />
        </div>
        <div className="gs-toolbar gs-panel lab-bar-group">
          {setup && (
            <Menu>
              <Tooltip>
                <TooltipTrigger render={<Button render={<MenuTrigger />} variant="ghost" size={desktop ? "sm" : "icon-sm"} aria-label="Algorithm and graph" />}>
                  <Shapes aria-hidden="true" /> {desktop ? info?.name : null}
                </TooltipTrigger>
                <TooltipContent side="bottom">Algorithm and graph</TooltipContent>
              </Tooltip>
              <MenuContent align="end" sideOffset={8} className="w-60">
                <MenuGroup>
                  <MenuGroupLabel>Algorithm</MenuGroupLabel>
                  <MenuRadioGroup value={setup.algorithm} onValueChange={(v) => navigate({ algorithm: v as string, g: null, step: "1" })}>
                    {LAB_ALGORITHMS.map((id) => (
                      <MenuRadioItem key={id} value={id} closeOnSelect>
                        {algorithmInfo(id).name}
                        <MenuItemIndicator><Check className="h-3.5 w-3.5" aria-hidden="true" /></MenuItemIndicator>
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
                <MenuSeparator />
                <MenuGroup>
                  <MenuGroupLabel>Graph</MenuGroupLabel>
                  <MenuRadioGroup value={setup.graphId} onValueChange={(v) => navigate({ algorithm: setup.algorithm, g: v as string, step: "1" })}>
                    {graphChoices(setup.algorithm).map((g) => (
                      <MenuRadioItem key={g.id} value={g.id} closeOnSelect>
                        {g.name}
                        <MenuItemIndicator><Check className="h-3.5 w-3.5" aria-hidden="true" /></MenuItemIndicator>
                      </MenuRadioItem>
                    ))}
                  </MenuRadioGroup>
                </MenuGroup>
              </MenuContent>
            </Menu>
          )}
          <Legend desktop={desktop} />
          <ThemeSelector theme={theme} setTheme={setTheme} alignDropdown="end" />
        </div>
      </header>

      {!desktop && setup && run.ends.length > 0 && (
        <div className="lab-phone-steps gs-toolbar gs-panel">
          <Transport {...transport} />
        </div>
      )}

      {"problem" in result && (
        <Panel className="lab-problem" role="alert">{result.problem}</Panel>
      )}

      {setup && view && summary && info && (
        <VariantView
          run={run}
          view={view}
          summary={summary}
          nodes={nodes}
          edges={edges}
          code={info.pseudocode}
          name={info.name}
          desktop={desktop}
          transport={transport}
          onScrub={onScrub}
        />
      )}
    </main>
  );
}

/* --------------------------------------------------------------- the key */

const KEY: Array<{ swatch: React.ReactNode; word: string }> = [
  { swatch: <circle cx="14" cy="10" r="6" fill="none" stroke="var(--color-state-waiting)" strokeWidth="2" strokeDasharray="3 3" />, word: "Waiting in the queue or stack (number: taken next)" },
  { swatch: <circle cx="14" cy="10" r="6" fill="none" stroke="var(--color-state-current)" strokeWidth="2.5" />, word: "Being worked on" },
  { swatch: <circle cx="14" cy="10" r="7" fill="var(--gradient-visited-mid)" stroke="var(--color-tint-visited)" />, word: "Visited, final or still in progress" },
  { swatch: <circle cx="14" cy="10" r="7" fill="var(--color-state-done)" stroke="var(--color-node-stroke)" />, word: "Done: the search has backed out of it" },
  { swatch: <rect x="2" y="3" width="24" height="14" rx="7" fill="var(--color-state-change)" />, word: "Changed this step (old value struck through)" },
  { swatch: <path d="M2 10 H26" stroke="var(--color-state-change)" strokeWidth="4" strokeLinecap="round" />, word: "The edge this step uses (arrow: which way)" },
  { swatch: <><rect x="1" y="3" width="26" height="14" rx="7" fill="var(--color-badge)" stroke="var(--color-badge-line)" /><text x="14" y="10.5" textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="var(--color-badge-text)">3/8</text></>, word: "Depth-first: found at time 3, done at 8" },
  { swatch: <path d="M2 10 H26" stroke="var(--color-edge-traversal)" strokeWidth="2.5" strokeDasharray="5 4" />, word: "Best way in so far, may still change" },
  { swatch: <path d="M2 10 H26" stroke="var(--color-edge-traversal)" strokeWidth="5" />, word: "The branch a depth-first search is in" },
  { swatch: <path d="M2 10 H26" stroke="var(--color-edge-back)" strokeWidth="3" strokeDasharray="8 4" />, word: "Back edge: leads to a node still in progress" },
  { swatch: <path d="M2 10 H26" stroke="var(--color-edge-forward)" strokeWidth="3" strokeDasharray="3 4" />, word: "Forward edge: to a finished node below" },
  { swatch: <path d="M2 10 H26" stroke="var(--color-edge-cross)" strokeWidth="3" strokeDasharray="1 5" strokeLinecap="round" />, word: "Cross edge: to a finished node elsewhere" },
];

function Legend({ desktop }: { desktop: boolean }) {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<Button render={<PopoverTrigger />} variant="ghost" size={desktop ? "sm" : "icon-sm"} aria-label="What the marks mean" />}>
          <KeyRound aria-hidden="true" /> {desktop ? "Key" : null}
        </TooltipTrigger>
        <TooltipContent side="bottom">What the marks mean</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" side="bottom" className="lab-key">
        <ul>
          {KEY.map((k) => (
            <li key={k.word}>
              <svg width="28" height="20" viewBox="0 0 28 20" aria-hidden="true">{k.swatch}</svg>
              <span>{k.word}</span>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
