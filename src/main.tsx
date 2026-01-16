import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";

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
      <div className="noMobileSupport">
        <span>This App is not supported in your browser.</span>
      </div>
    )}
  </StrictMode>
);
