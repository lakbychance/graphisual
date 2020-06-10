import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";

const isChrome =
  !!(window as any).chrome &&
  (!!(window as any).chrome.webstore || !!(window as any).chrome.runtime);

ReactDOM.render(
  <React.StrictMode>
    {isChrome ? (
      <App />
    ) : (
      <h1 style={{ textAlign: "center" }}>
        This App is not supported in this browser. Please use Google Chrome.
      </h1>
    )}
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();
