import React, { useState } from "react";
import { Graph } from "../Graph/Graph";
import styles from "./Board.module.css";
import {
  Dropdown,
  IDropdownOption,
  Slider,
  ProgressIndicator,
} from "@fluentui/react";
import { edgeOptions, algoOptions } from "../../configs/readOnly";
import { optionButtonStyles } from "./BoardStyles";
import appIcon from "../../images/graphisual.svg";

export const Board = (props: any) => {
  //states,props and refs
  const [options, setOptions] = useState<any>({
    drawNode: true,
    moveNode: false,
    deleteNode: false,
    reset: false,
    editEdge: false,
    deleteEdge: false,
    selectStartNode: false,
    selectEndNode: false,
  });

  const [selectedEdge, setSelectedEdge] = useState<any>();
  const [selectedAlgo, setSelectedAlgo] = useState<any>();
  const [isVisualizing, setVisualizingState] = useState<any>();
  const [visualizationSpeed, setVisualizationSpeed] = useState<any>(250);
  //Activates the desired board option
  const activateOption = (option: string | number) => {
    Object.keys(options).forEach((key: any) => {
      if (key === option) {
        options[key] = true;
      } else {
        options[key] = false;
      }
    });
    setSelectedEdge({ key: "select", text: "Select Edge" });
    setSelectedAlgo({ key: "select", text: "Select Algorithm" });
    setOptions(options);
  };
  const handleEdgeOptions = (
    event: any,
    option: IDropdownOption | undefined
  ) => {
    setOptions({
      drawNode: false,
      moveNode: false,
      deleteNode: false,
      reset: false,
      editEdge: false,
      deleteEdge: false,
      selectStartNode: false,
      selectEndNode: false,
    });
    setSelectedAlgo({ key: "select", text: "Select Algorithm" });
    setSelectedEdge(option);
  };
  const handleAlgoOptions = (
    event: any,
    option: IDropdownOption | undefined
  ) => {
    // setOptions({
    //   drawNode: false,
    //   moveNode: false,
    //   deleteNode: false,
    //   reset: false,
    //   editEdge: false,
    //   deleteEdge: false,
    // });
    setSelectedAlgo(option);
    setSelectedEdge({ key: "select", text: "Select Edge" });
    if (option?.key === "select") {
      setOptions({
        selectStartNode: false,
        selectEndNode: false,
        editEdge: false,
        deleteEdge: false,
        drawNode: false,
        moveNode: false,
        deleteNode: false,
        reset: false,
      });
    } else if (option?.key === "bfs" || option?.key === "dfs") {
      setOptions({
        selectStartNode: true,
        selectEndNode: false,
        editEdge: false,
        deleteEdge: false,
        drawNode: false,
        moveNode: false,
        deleteNode: false,
        reset: false,
      });
    } else {
      setOptions({
        selectStartNode: true,
        selectEndNode: true,
        editEdge: false,
        deleteEdge: false,
        drawNode: false,
        moveNode: false,
        deleteNode: false,
        reset: false,
      });
    }
  };
  return (
    <>
      <div className={styles.board}>
        <div className={styles.controlPanel}>
          <img className={styles.appIcon} src={appIcon} alt="App Icon"></img>
          <div className={styles.nodeOptions}>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("drawNode")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-circle`}></i>
              Draw Node
            </button>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("moveNode")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-arrows-alt`}></i>
              Move Node
            </button>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("deleteNode")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-trash`}></i>
              Delete Node
            </button>
          </div>
          <div className={styles.edgeOptions}>
            <Dropdown
              className={styles.dropdownWrapper}
              options={edgeOptions}
              styles={optionButtonStyles.edgeDropdown}
              placeholder="Select Edge"
              selectedKey={selectedEdge && selectedEdge.key}
              onChange={handleEdgeOptions}
              disabled={isVisualizing}
            />
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("editEdge")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-pen`}></i>
              Edit Edge
            </button>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("deleteEdge")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-trash`}></i>
              Delete Edge
            </button>
          </div>
          <div className={styles.visualizeControls}>
            <Dropdown
              className={styles.dropdownWrapper}
              options={algoOptions}
              styles={optionButtonStyles.algoDropdown}
              placeholder="Select Algorithm"
              selectedKey={selectedAlgo && selectedAlgo.key}
              onChange={handleAlgoOptions}
              disabled={isVisualizing}
            />
            <Slider
              className={styles.speedSlider}
              label="Visual Delay"
              styles={{
                titleLabel: { color: "white" },
                valueLabel: { color: "white" },
                inactiveSection: { background: "white" },
                activeSection: {
                  backgroundImage: "linear-gradient(45deg, #eaecff, #946cff)",
                },
              }}
              min={100}
              max={1000}
              step={100}
              value={visualizationSpeed}
              onChange={setVisualizationSpeed}
              disabled={isVisualizing}
            />
          </div>
          <div className={styles.miscellaneous}>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("reset")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-undo-alt`}></i>
              Reset
            </button>
          </div>
        </div>
        <div className={styles.visualizerProgress}>
          {isVisualizing ? (
            <ProgressIndicator styles={{ itemProgress: { padding: "0" } }} />
          ) : (
            <hr />
          )}
        </div>
        <div className={styles.graphContainer}>
          <Graph
            options={options}
            selectedAlgo={selectedAlgo}
            selectedEdge={selectedEdge}
            setOptions={setOptions}
            visualizationSpeed={visualizationSpeed}
            setVisualizingState={setVisualizingState}
          />
        </div>
      </div>
    </>
  );
};
