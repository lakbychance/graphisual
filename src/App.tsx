import { LazyMotion, domAnimation } from "motion/react";
import { Board } from "./components/Board/Board";
import { Toaster } from "sonner";
import { useTheme } from "./hooks/useTheme";

function App() {
  // Initialize theme system (applies data-theme attribute to document)
  useTheme();

  return (
    <LazyMotion features={domAnimation} strict>
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
    </LazyMotion>
  );
}

export default App;
