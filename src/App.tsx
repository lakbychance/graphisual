import { lazy, Suspense } from "react";
import { LazyMotion, domMax } from "motion/react";
import { Board } from "./components/Board/Board";
import { Toaster } from "sonner";
import { useApplyTheme } from "@/theme";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Dev/design surface: every control in each theme. Local development only:
// `import.meta.env.DEV` is a build-time constant, so a production build drops
// both the route and the playground's code.
const ThemePlayground = import.meta.env.DEV ? lazy(() => import("./playground")) : null;
const isPlayground =
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  window.location.pathname.replace(/\/+$/, "") === "/theme-playground";

// Design surface for the run UI: live variants side by side (`/rework-lab`). On the dev server and
// Vercel previews only: `__REWORK_LAB__` is a build-time constant (see vite.config.ts), so a
// production build drops both the route and the lab's code.
const ReworkLab = __REWORK_LAB__ ? lazy(() => import("./lab")) : null;
const isReworkLab =
  __REWORK_LAB__ &&
  typeof window !== "undefined" &&
  window.location.pathname.replace(/\/+$/, "") === "/rework-lab";

function App() {
  // Initialize theme system (applies data-theme attribute to document)
  useApplyTheme();

  return (
    <LazyMotion features={domMax} strict>
      {isPlayground && ThemePlayground ? (
        <Suspense fallback={null}>
          <ThemePlayground />
        </Suspense>
      ) : isReworkLab && ReworkLab ? (
        <Suspense fallback={null}>
          <ReworkLab />
        </Suspense>
      ) : (
        <Board />
      )}
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-text)",
            border: "none",
            borderRadius: "8px",
            boxShadow: "var(--shadow-raised-lg)",
            fontFamily: "var(--font-sans)",
            color: "var(--color-surface)",
          },
        }}
      />
      <SpeedInsights />
    </LazyMotion>
  );
}

export default App;
