import React from "react";
import { initializeIcons } from "@fluentui/react";
import "./App.css";
import { Board } from "./components/Board/Board";
initializeIcons();
function App() {
  return <Board />;
}

export default App;
