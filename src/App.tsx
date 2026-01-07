import { Board } from "./components/Board/Board";
import { Toaster } from "sonner";
import { useTheme } from "./hooks/useTheme";

function App() {
  // Initialize theme system (applies data-theme attribute to document)
  useTheme();

  return (
    <>
      <Board />
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--color-surface)",
            border: "none",
            borderRadius: "8px",
            boxShadow: "var(--shadow-raised-lg), var(--highlight-edge)",
            fontFamily: "var(--font-sans)",
            color: "var(--color-text)",
          },
        }}
      />
    </>
  );
}

export default App;
