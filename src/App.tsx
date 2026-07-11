import { LazyMotion, domMax } from "motion/react";
import { Board } from "./components/Board/Board";
import { Toaster } from "sonner";
import { useApplyTheme } from "@/theme";
import { SpeedInsights } from "@vercel/speed-insights/react";

function App() {
  // Initialize theme system (applies data-theme attribute to document)
  useApplyTheme();

  return (
    <LazyMotion features={domMax} strict>
      <Board />
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
