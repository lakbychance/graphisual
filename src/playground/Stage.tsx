import { useEffect, useState } from "react";
import { Panel, Toolbar } from "@/components/ui-sdk";
import { MainToolbar } from "./recipes/MainToolbar";
import { StepControls } from "./recipes/StepControls";
import { TracePanel } from "./recipes/TracePanel";
import { HistoryControls, ShortcutsPopover, ThemeMenu, TraceToggle, ZoomControls } from "./recipes/CornerControls";
import { GraphLab } from "./recipes/GraphLab";
import { BFS_STEPS } from "./recipes/mock";

/**
 * The whole board chrome in one skin: toolbar, step controls, trace panel,
 * corner controls, over a grid canvas with a BFS you can step through.
 */
export function Stage() {
  const [index, setIndex] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [stepMode, setStepMode] = useState(true);
  const [traceVisible, setTraceVisible] = useState(true);
  const last = BFS_STEPS.length - 1;

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        if (i >= last) { setPlaying(false); return i; }
        return i + 1;
      });
    }, 900);
    return () => window.clearInterval(id);
  }, [playing, last]);

  const step = BFS_STEPS[index];

  return (
    <div className="pg-stage">
      <div className="pg-stage-canvas">
        <GraphLab step={step} width="100%" height="auto" className="pg-stage-graph" />
      </div>

      <div className="pg-stage-top">
        <MainToolbar mode={stepMode ? "manual" : "auto"} onModeChange={(m) => setStepMode(m === "manual")} />
        {stepMode && (
          <StepControls
            index={index}
            total={BFS_STEPS.length}
            playing={playing}
            onJumpStart={() => setIndex(0)}
            onPrev={() => setIndex((i) => Math.max(0, i - 1))}
            onNext={() => setIndex((i) => Math.min(last, i + 1))}
            onJumpEnd={() => setIndex(last)}
            onTogglePlay={() => setPlaying((p) => !p)}
            onDone={() => { setPlaying(false); setStepMode(false); }}
          />
        )}
      </div>

      {stepMode && traceVisible && (
        <div className="pg-stage-bottom">
          <TracePanel step={step} onCollapse={() => setTraceVisible(false)} />
        </div>
      )}

      <div className="pg-stage-bl">
        <ZoomControls />
        <HistoryControls />
      </div>

      <div className="pg-stage-br gs-toolbar gs-panel">
        {stepMode && !traceVisible && <TraceToggle onExpand={() => setTraceVisible(true)} />}
        <ShortcutsPopover />
        <ThemeMenu />
      </div>

      {!stepMode && (
        <Panel className="pg-stage-hint-wrap">
          <Toolbar surface="bare" aria-label="Hint" className="gs-hint">Click a node to start BFS</Toolbar>
        </Panel>
      )}
    </div>
  );
}
