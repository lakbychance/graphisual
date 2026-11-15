import { lazy, Suspense } from "react";
import { LazyMotion, domMax } from "motion/react";
import { Board } from "./components/Board/Board";
import { Toaster } from "sonner";
import { useApplyTheme } from "@/theme";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Dev/design surface: every control rebuilt on ui-sdk in several skins. Code-split so the
// editor bundle never pays for it.
const ThemePlayground = lazy(() => import("./playground"));
const isPlayground =
  typeof window !== "undefined" && window.location.pathname.replace(/\/+$/, "") === "/theme-playground";

function App() {
  // Initialize theme system (applies data-theme attribute to document)
  useApplyTheme();

  return (
    <LazyMotion features={domMax} strict>
      {isPlayground ? (
        <Suspense fallback={null}>
          <ThemePlayground />
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
