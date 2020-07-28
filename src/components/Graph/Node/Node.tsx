import React from "react";
import styles from "./Node.module.css";
import { calculateCurve, calculateTextLoc } from "../../../utility/calc";
import { NodeProps } from "./INode";
import { IEdge } from "../IGraph";
export const Node = (props: NodeProps) => {
  const {
    node,
    edges,
    handleMove,
    handleEdge,
    deleteNodeMode,
    deleteEdgeMode,
    editEdgeMode,
    readyForVisualization,
    readyForMovement,
    readyForEdge,
    pathFindingNode,
  } = props;
  return (
    <g className={styles.nodeGroup}>
      <circle
        onPointerDown={handleMove}
        className={`${styles.node} ${deleteNodeMode && styles.deleteNodeMode} ${
          node.isVisited && styles.visited
        } ${node.isInShortestPath && styles.shortestPath} ${
          readyForVisualization && styles.readyForVisualization
        } ${
          pathFindingNode &&
          pathFindingNode.startNodeId === node.id &&
          styles.startNode
        } 
         ${
           pathFindingNode &&
           pathFindingNode.endNodeId === node.id &&
           styles.endNode
         } `}
        cx={node.x}
        cy={node.y}
        r={node.r}
        id={node.id.toString()}
      ></circle>
      {edges &&
        edges?.get(node.id)?.map((edge: IEdge) => {
          let directedPath = calculateCurve(edge.x1, edge.y1, edge.x2, edge.y2);
          let undirectedPath = `M${edge.x1},${edge.y1} L${edge.x2},${edge.y2}`;
          let textCoordDirected = calculateTextLoc(
            edge.x1,
            edge.y1,
            edge.x2,
            edge.y2
          );
          return (
            <>
              {edge.type === "directed" && (
                <>
                  <marker
                    className={`${styles.arrow} ${
                      edge.isUsedInTraversal && styles.arrowTraversal
                    } ${edge.isUsedInShortestPath && styles.arrowShortestPath}`}
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
                    } ${editEdgeMode && styles.editEdgeMode} ${
                      (readyForVisualization ||
                        readyForMovement ||
                        readyForEdge) &&
                      styles.disableEdge
                    } ${edge.isUsedInTraversal && styles.usedInTraversal} ${
                      edge.isUsedInShortestPath && styles.usedInShortestPath
                    }`}
                    markerEnd={`url(#arrowhead${node.id}${edge.to})`}
                  >
                    dsds
                  </path>
                  {edge.weight && (
                    <text
                      className={styles.edgeText}
                      x={textCoordDirected.c1x}
                      y={textCoordDirected.c1y + 7}
                    >
                      {edge.weight}
                    </text>
                  )}
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
                    } ${editEdgeMode && styles.editEdgeMode}
                    ${
                      (readyForVisualization ||
                        readyForMovement ||
                        readyForEdge) &&
                      styles.disableEdge
                    } 
                    ${edge.isUsedInTraversal && styles.usedInTraversal}
                    ${edge.isUsedInShortestPath && styles.usedInShortestPath}
                    `}
                  ></path>
                  {edge.weight && (
                    <text
                      className={styles.edgeText}
                      x={(edge.x1 + edge.nodeX2) / 2}
                      y={(edge.y1 + edge.nodeY2) / 2 - 10}
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
