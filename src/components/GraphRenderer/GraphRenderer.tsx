import { Suspense, useRef, useImperativeHandle, lazy, type Ref } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Graph, type GraphHandle } from "../Graph/Graph";
import type { Graph3DHandle } from "../Graph3D";
import { useSettingsStore } from "../../store/settingsStore";

// Lazy load Graph3D (and Three.js) - only downloaded when user toggles 3D mode on desktop
const Graph3D = lazy(() =>
  import("../Graph3D").then((mod) => ({ default: mod.Graph3D }))
);

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
        <motion.div
          key="3d"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-[var(--color-text-muted)]">
                Loading 3D…
              </div>
            }
          >
            <Graph3D ref={graph3DRef} />
          </Suspense>
        </motion.div>
      ) : (
        <motion.div
          key="2d"
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
          <Graph ref={graphRef} />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
