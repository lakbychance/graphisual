import React from "react";
import styles from "./Node.module.css";
import { calculateCurve } from "../../../utility/calc";
export const Node = (props: any) => {
  const {
    node,
    edges,
    handleMove,
    handleEdge,
    deleteNodeMode,
    deleteEdgeMode,
    editEdgeMode,
  } = props;
  return (
    <g className={styles.nodeGroup}>
      <circle
        onMouseDown={handleMove}
        className={`${styles.node} ${deleteNodeMode && styles.deleteNodeMode}`}
        cx={node.x}
        cy={node.y}
        r={node.r}
        id={node.id}
      ></circle>
      {edges &&
        edges.get(node.id).map((edge: any) => {
          let directedPath = calculateCurve(edge.x1, edge.y1, edge.x2, edge.y2);
          let undirectedPath = `M${edge.x1},${edge.y1} L${edge.y1},${edge.y2}`;
          return (
            <>
              {edge.type === "directed" && (
                <>
                  <marker
                    className={styles.arrow}
                    id={`arrowhead${node.id}${edge.to}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="9.7"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" />
                  </marker>
                  <path
                    onClick={() => handleEdge(edge, node.id)}
                    d={directedPath}
                    className={`${styles.directedEdge} ${
                      deleteEdgeMode && styles.deleteEdgeMode
                    } ${editEdgeMode && styles.editEdgeMode}`}
                    markerEnd={`url(#arrowhead${node.id}${edge.to})`}
                  ></path>
                </>
              )}

              {edge.type === "undirected" && (
                <>
                  <line
                    onClick={() => handleEdge(edge, node.id)}
                    x1={edge.x1}
                    y1={edge.y1}
                    x2={edge.x2}
                    y2={edge.y2}
                    className={`${styles.undirectedEdge} ${
                      deleteEdgeMode && styles.deleteEdgeMode
                    } ${editEdgeMode && styles.editEdgeMode} `}
                  ></line>
                </>
              )}
            </>
          );
        })}
      <text className={styles.nodeText} x={node.x} y={node.y + 5}>
        {node.id}
      </text>
    </g>
  );
};
