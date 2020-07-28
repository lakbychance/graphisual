import React, { useState, useEffect } from "react";
import { Graph } from "../Graph/Graph";
import styles from "./Board.module.css";
import { mapValues } from "lodash";
import {
  Dropdown,
  IDropdownOption,
  Slider,
  ProgressIndicator,
} from "@fluentui/react";
import { edgeOptions, algoOptions } from "../../configs/readOnly";
import { optionButtonStyles, sliderOptions } from "./BoardStyles";
import appIcon from "../../images/graphisual.svg";
import { IOptions } from "./IBoard";
import { INodeSelection } from "../Graph/IGraph";

export const Board = () => {
  const [options, setOptions] = useState<IOptions>({
    drawNode: true,
    moveNode: false,
    deleteNode: false,
    reset: false,
    editEdge: false,
    deleteEdge: false,
  });
  const [isPullDownMenuOpen, setPullDownMenuState] = useState<boolean>(false);
  const [nodeSelection, setNodeSelection] = useState<INodeSelection>({
    isStartNodeSelected: false,
    isEndNodeSelected: false,
  });
  const [selectedEdge, setSelectedEdge] = useState<IDropdownOption | undefined>(
    edgeOptions[0]
  );
  const [selectedAlgo, setSelectedAlgo] = useState<IDropdownOption | undefined>(
    algoOptions[0]
  );
  const [isVisualizing, setVisualizingState] = useState(false);
  const [visualizationSpeed, setVisualizationSpeed] = useState<any>(250);

  useEffect(() => {
    if (!isVisualizing) {
      setSelectedAlgo({ key: "select", text: "Select Algorithm" });
      // setNodeSelection({...options})
    }
  }, [isVisualizing]);

  //Activates the desired option from control panel.
  const activateOption = (option: string | number) => {
    const updatedOptions = mapValues(options, (_value: boolean, key: string) =>
      key === option ? true : false
    );
    setSelectedEdge({ key: "select", text: "Select Edge" });
    setSelectedAlgo({ key: "select", text: "Select Algorithm" });
    setNodeSelection({
      ...nodeSelection,
      isStartNodeSelected: false,
      isEndNodeSelected: false,
    });
    setOptions(updatedOptions);
    setPullDownMenuState(false);
  };

  //handles the selection of edge options and corresponding toggles for other options in control panel.
  const handleEdgeOptions = (
    _event: React.FormEvent<HTMLDivElement>,
    option: IDropdownOption | undefined
  ) => {
    const updatedOptions = mapValues(options, () => false);
    setOptions(updatedOptions);
    setSelectedAlgo({ key: "select", text: "Select Algorithm" });
    setSelectedEdge(option);
    setPullDownMenuState(false);
  };

  //handles the selection of algo options and corresponding toggles for other options in control panel.
  const handleAlgoOptions = (
    _event: React.FormEvent<HTMLDivElement>,
    option: IDropdownOption | undefined
  ) => {
    setSelectedAlgo(option);
    setSelectedEdge({ key: "select", text: "Select Edge" });
    if (option?.key === "select") {
      const updatedOptions = mapValues(options, () => false);
      setOptions(updatedOptions);
    } else if (option?.data === "traversal") {
      setNodeSelection({ ...nodeSelection, isStartNodeSelected: true });
      const updatedOptions = mapValues(options, () => false);
      setOptions(updatedOptions);
    } else if (option?.data === "pathfinding") {
      setNodeSelection({
        ...nodeSelection,
        isStartNodeSelected: true,
        isEndNodeSelected: true,
      });
      const updatedOptions = mapValues(options, () => false);
      setOptions(updatedOptions);
    }
    setPullDownMenuState(false);
  };
  const handlePullDownMenu = () => {
    setPullDownMenuState(!isPullDownMenuOpen);
  };
  return (
    <>
      <div className={styles.board}>
        <div
          className={styles.controlPanel}
          style={isPullDownMenuOpen ? { top: "-7%" } : { top: "-125%" }}
        >
          <img className={styles.appIcon} src={appIcon} alt="App Icon"></img>
          <div className={styles.nodeOptions}>
            <button
              className={`${styles.optionButtons} ${
                options.drawNode && styles.selectedButtonOption
              }`}
              onClick={() => activateOption("drawNode")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-circle`}></i>
              Draw Node
            </button>
            <button
              className={`${styles.optionButtons} ${
                options.moveNode && styles.selectedButtonOption
              }`}
              onClick={() => activateOption("moveNode")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-arrows-alt`}></i>
              Move Node
            </button>
            <button
              className={`${styles.optionButtons} ${
                options.deleteNode && styles.selectedButtonOption
              }`}
              onClick={() => activateOption("deleteNode")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-trash`}></i>
              Delete Node
            </button>
          </div>
          <div className={styles.edgeOptions}>
            <Dropdown
              className={`${styles.dropdownWrapper} ${
                selectedEdge?.key !== "select" && styles.selectedDropdownOption
              }`}
              options={edgeOptions}
              styles={optionButtonStyles.edgeDropdown}
              placeholder="Select Edge"
              selectedKey={selectedEdge && selectedEdge.key}
              onChange={handleEdgeOptions}
              disabled={isVisualizing}
            />
            <button
              className={`${styles.optionButtons} ${
                options.editEdge && styles.selectedButtonOption
              }`}
              onClick={() => activateOption("editEdge")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-pen`}></i>
              Edit Edge
            </button>
            <button
              className={`${styles.optionButtons} ${
                options.deleteEdge && styles.selectedButtonOption
              }`}
              onClick={() => activateOption("deleteEdge")}
              disabled={isVisualizing}
            >
              <i className={`${styles.icon} fas fa-trash`}></i>
              Delete Edge
            </button>
          </div>
          <div className={styles.visualizeControls}>
            <Dropdown
              className={`${styles.dropdownWrapper} ${
                selectedAlgo?.key !== "select" && styles.selectedDropdownOption
              }`}
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
              styles={sliderOptions}
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
              className={`${styles.optionButtons} ${
                options.reset && styles.selectedButtonOption
              }`}
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
            visualizationSpeed={visualizationSpeed}
            setVisualizingState={setVisualizingState}
            isVisualizing={isVisualizing}
            nodeSelection={nodeSelection}
            setNodeSelection={setNodeSelection}
          />
          <div className={styles.pullDownMenu} onClick={handlePullDownMenu}>
            <div
              className={styles.pullDownMenuButton}
              style={
                isPullDownMenuOpen
                  ? { transform: "rotate(225deg)" }
                  : { transform: "rotate(45deg" }
              }
            ></div>
          </div>
          <div className={styles.madeInIndia}>
            <span>
              Made with <span style={{ color: "#e74c3c" }}>&hearts;</span> in
              India
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
