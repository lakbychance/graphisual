import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./globals.css";
import graphisualLogo from "./images/graphisual.svg";

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
        <img alt="Graphisual logo" src={graphisualLogo} />
        <span>This App is not supported in your browser.</span>
      </div>
    )}
  </StrictMode>
);
