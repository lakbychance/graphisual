import React, { useRef, useState } from "react";
import { Graph } from "../Graph/Graph";
import styles from "./Board.module.css";
import {
  PrimaryButton,
  Dropdown,
  IDropdownOption,
  HighContrastSelectorWhite,
  ImageIcon,
} from "@fluentui/react";
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
            <PrimaryButton
              styles={{
                root: optionButtonStyles.drawNode.normal,
                rootHovered: optionButtonStyles.drawNode.hovered,
              }}
              onClick={() => activateOption("drawNode")}
            >
              <i className={`${styles.icon} fas fa-circle`}></i>
              Draw Node
            </PrimaryButton>
            <PrimaryButton
              styles={{
                root: optionButtonStyles.moveNode.normal,
                rootHovered: optionButtonStyles.moveNode.hovered,
              }}
              onClick={() => activateOption("moveNode")}
            >
              <i className={`${styles.icon} fas fa-arrows-alt`}></i>
              Move Node
            </PrimaryButton>
            <PrimaryButton
              styles={{
                root: optionButtonStyles.deleteNode.normal,
                rootHovered: optionButtonStyles.deleteNode.hovered,
              }}
              onClick={() => activateOption("deleteNode")}
            >
              <i className={`${styles.icon} fas fa-trash`}></i>
              Delete Node
            </PrimaryButton>
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
            <PrimaryButton
              styles={{
                root: optionButtonStyles.deleteNode.normal,
                rootHovered: optionButtonStyles.deleteNode.hovered,
              }}
              onClick={() => activateOption("editEdge")}
            >
              <i className={`${styles.icon} fas fa-pen`}></i>
              Edit Edge
            </PrimaryButton>
            <PrimaryButton
              styles={{
                root: optionButtonStyles.deleteNode.normal,
                rootHovered: optionButtonStyles.deleteNode.hovered,
              }}
              onClick={() => activateOption("deleteEdge")}
            >
              <i className={`${styles.icon} fas fa-trash`}></i>
              Delete Edge
            </PrimaryButton>
          </div>
          <div className={styles.miscellaneous}>
            {" "}
            <PrimaryButton
              styles={{
                root: optionButtonStyles.reset.normal,
                rootHovered: optionButtonStyles.reset.hovered,
              }}
              onClick={() => activateOption("reset")}
            >
              <i className={`${styles.icon} fas fa-undo-alt`}></i>
              Reset
            </PrimaryButton>
          </div>
        </div>
        <div className={styles.graphContainer}>
          <Graph options={options} selectedEdge={selectedEdge} />
        </div>
      </div>
    </>
  );
};
