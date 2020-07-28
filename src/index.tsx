import React from "react";
import ReactDOM from "react-dom";
import "./index.css";
import App from "./App";
import * as serviceWorker from "./serviceWorker";
import graphisual from "./images/graphisual.svg";

ReactDOM.render(
  <React.StrictMode>
    {window.PointerEvent ? (
      <App />
    ) : (
      <div className="noMobileSupport">
        <img alt="logo icon" src={graphisual}></img>
        <span>This App is not supported in your browser.</span>
      </div>
    )}
  </React.StrictMode>,
  document.getElementById("root")
);

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.register();
