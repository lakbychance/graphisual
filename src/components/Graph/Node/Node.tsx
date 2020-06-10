import React from "react";
import styles from "./Node.module.css";
import { calculateCurve, calculateTextLoc } from "../../../utility/calc";
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
        className={`${styles.node} ${deleteNodeMode && styles.deleteNodeMode} ${
          node.isVisited && styles.visited
        } ${node.isInShortestPath && styles.shortestPath}`}
        cx={node.x}
        cy={node.y}
        r={node.r}
        id={node.id}
      ></circle>
      {edges &&
        edges.get(node.id).map((edge: any) => {
          let directedPath = calculateCurve(edge.x1, edge.y1, edge.x2, edge.y2);
          let undirectedPath = `M${edge.x1},${edge.y1} L${edge.x2},${edge.y2}`;
          let textCoord = calculateTextLoc(edge.x1, edge.y1, edge.x2, edge.y2);
          return (
            <>
              {edge.type === "directed" && (
                <>
                  <marker
                    className={styles.arrow}
                    id={`arrowhead${node.id}${edge.to}`}
                    markerWidth="10"
                    markerHeight="7"
                    refX="8.7"
                    refY="3.5"
                    orient="auto"
                  >
                    <polygon points="0 0, 10 3.5, 0 7" />
                  </marker>
                  <path
                    id={`${node.id}${edge.to}`}
                    onClick={() => handleEdge(edge, node)}
                    d={directedPath}
                    className={`${styles.directedEdge} ${
                      deleteEdgeMode && styles.deleteEdgeMode
                    } ${editEdgeMode && styles.editEdgeMode}`}
                    markerEnd={`url(#arrowhead${node.id}${edge.to})`}
                  >
                    dsds
                  </path>
                  {edge.weight && (
                    <text
                      className={styles.edgeText}
                      x={textCoord.c1x}
                      y={textCoord.c1y + 7}
                    >
                      {edge.weight}
                    </text>
                  )}
                  })}
                </>
              )}

              {edge.type === "undirected" && (
                <>
                  <path
                    d={undirectedPath}
                    id={`${node.id}${edge.to}`}
                    onClick={() => handleEdge(edge, node)}
                    className={`${styles.undirectedEdge} ${
                      deleteEdgeMode && styles.deleteEdgeMode
                    } ${editEdgeMode && styles.editEdgeMode} `}
                  ></path>
                  {edge.weight && (
                    <text
                      className={styles.edgeText}
                      x={(edge.x1 + edge.nodeX2) / 2}
                      y={(edge.y1 + edge.nodeY2) / 2 - 5}
                    >
                      {edge.weight}
                    </text>
                  )}
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
