import React, { useRef, useState } from "react";
import { Graph } from "../Graph/Graph";
import styles from "./Board.module.css";
import { Dropdown, IDropdownOption } from "@fluentui/react";
import { edgeOptions } from "../../configs/readOnly";
import { optionButtonStyles } from "./BoardStyles";

export const Board = (props: any) => {
  //states,props and refs
  const [options, setOptions] = useState<any>({
    drawNode: false,
    moveNode: false,
    deleteNode: false,
    reset: false,
    editEdge: false,
    deleteEdge: false,
  });
  const [selectedEdge, setSelectedEdge] = useState<any>();
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
    setOptions(options);
  };

  return (
    <>
      <div className={styles.board}>
        <div className={styles.controlPanel}>
          <div className={styles.nodeOptions}>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("drawNode")}
            >
              <i className={`${styles.icon} fas fa-circle`}></i>
              Draw Node
            </button>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("moveNode")}
            >
              <i className={`${styles.icon} fas fa-arrows-alt`}></i>
              Move Node
            </button>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("deleteNode")}
            >
              <i className={`${styles.icon} fas fa-trash`}></i>
              Delete Node
            </button>
          </div>
          <div className={styles.edgeOptions}>
            <Dropdown
              className={styles.dropdownWrapper}
              options={edgeOptions}
              styles={optionButtonStyles.dropdown}
              placeholder="Select Edge"
              selectedKey={selectedEdge && selectedEdge.key}
              onChange={(event: any, option: IDropdownOption | undefined) => {
                setOptions({
                  drawNode: false,
                  moveNode: false,
                  deleteNode: false,
                  reset: false,
                  editEdge: false,
                  deleteEdge: false,
                });
                setSelectedEdge(option);
              }}
            />
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("editEdge")}
            >
              <i className={`${styles.icon} fas fa-pen`}></i>
              Edit Edge
            </button>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("deleteEdge")}
            >
              <i className={`${styles.icon} fas fa-trash`}></i>
              Delete Edge
            </button>
          </div>
          <div className={styles.miscellaneous}>
            <button
              className={styles.optionButtons}
              onClick={() => activateOption("reset")}
            >
              <i className={`${styles.icon} fas fa-undo-alt`}></i>
              Reset
            </button>
          </div>
        </div>
        <div className={styles.graphContainer}>
          <Graph options={options} selectedEdge={selectedEdge} />
        </div>
      </div>
    </>
  );
};
