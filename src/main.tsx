import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

import { scan } from "react-scan"; // must be imported before React and React DOM

scan({
  enabled: true,
});

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    {window.PointerEvent ? (
      <App />
    ) : (
      <div className="noMobileSupport">
        <span>This App is not supported in your browser.</span>
      </div>
    )}
  </StrictMode>
);
