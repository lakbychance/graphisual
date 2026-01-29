import { Suspense, useRef, useImperativeHandle, lazy, type Ref } from "react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { ErrorBoundary } from "react-error-boundary";
import { AlertTriangle } from "lucide-react";
import { Graph, type GraphHandle } from "../Graph/Graph";
import type { Graph3DHandle } from "../Graph3D";
import { useSettingsStore } from "../../store/settingsStore";
import { Button } from "@/components/ui/button";

// Lazy load Graph3D (and Three.js) - only downloaded when user toggles 3D mode on desktop
const Graph3D = lazy(() =>
  import("../Graph3D").then((mod) => ({ default: mod.Graph3D }))
);

// Fallback component for 3D rendering errors
function Graph3DErrorFallback() {
  const setIs3DMode = useSettingsStore((state) => state.setIs3DMode);
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <AlertTriangle className="w-12 h-12 text-[var(--color-error)]" />
      <h2 className="text-lg font-semibold">3D rendering failed</h2>
      <p className="text-sm text-[var(--color-text-muted)]">
        There was a problem with the 3D view
      </p>
      <Button onClick={() => setIs3DMode(false)} variant="secondary">
        Switch to 2D view
      </Button>
    </div>
  );
}

export interface GraphRendererHandle {
  getGraphRef: () => GraphHandle | null;
  getGraph3DRef: () => Graph3DHandle | null;
}

export const GraphRenderer = ({
  ref,
}: {
  ref?: Ref<GraphRendererHandle>;
}) => {
  const is3DMode = useSettingsStore((state) => state.is3DMode);

  const graphRef = useRef<GraphHandle>(null);
  const graph3DRef = useRef<Graph3DHandle>(null);

  // Expose refs to parent via imperative handle
  useImperativeHandle(
    ref,
    () => ({
      getGraphRef: () => graphRef.current,
      getGraph3DRef: () => graph3DRef.current,
    }),
    []
  );

  return (
    <AnimatePresence mode="wait">
      {is3DMode ? (
        <m.div
          key="3d"
          className="absolute inset-0"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.15 }}
        >
          <ErrorBoundary FallbackComponent={Graph3DErrorFallback}>
            <Suspense
              fallback={
                <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
                  Loading 3D…
                </div>
              }
            >
              <Graph3D ref={graph3DRef} />
            </Suspense>
          </ErrorBoundary>
        </m.div>
      ) : (
        <m.div
          key="2d"
          className="absolute inset-0"
          initial={{ opacity: 0, filter: 'blur(8px)' }}
          animate={{ opacity: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, filter: 'blur(8px)' }}
          transition={{ duration: 0.15 }}
        >
          <Graph ref={graphRef} />
        </m.div>
      )}
    </AnimatePresence>
  );
};
