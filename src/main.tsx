import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import "./components/ui-sdk/physics/physics.css";
import { installPressPhysics } from "./components/ui-sdk/press-physics";
import { setControlPhysicsEnabled } from "./components/ui-sdk/physics/controls";
import { setPressSoundEnabled } from "./components/ui-sdk/press-sound";
import { useSettingsStore } from "./store/settingsStore";

installPressPhysics();
// Controls and the graph move as simulated masses in each theme's own material
// (skipped when the system asks for reduced motion).
setControlPhysicsEnabled(true);
// Keep the sound engine in step with the persisted setting.
setPressSoundEnabled(useSettingsStore.getState().soundEnabled);
useSettingsStore.subscribe((state) => setPressSoundEnabled(state.soundEnabled));

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    {window.PointerEvent ? (
      <App />
    ) : (
      <div className="h-dvh flex items-center justify-center p-6 text-center">
        <span>This App is not supported in your browser.</span>
      </div>
    )}
  </StrictMode>
);
