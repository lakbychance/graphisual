import React, { useState, useRef, useEffect, useCallback } from "react";
import { Node } from "../Graph/Node/Node";
import styles from "./Graph.module.css";
import {
  calculateAccurateCoords,
  findToNodeForTouchBasedDevices,
} from "../../utility/calc";
import { Modal, TextField, MessageBar, MessageBarType } from "@fluentui/react";
import {
  bfs,
  dfs,
  dijkstra,
  IPathFinding,
  minspantreeprims,
} from "../../algorithms/algorithm";
import { GraphProps, INode, IEdge } from "./IGraph";
import { cloneDeep } from "lodash";
import { algoMessages } from "../../configs/readOnly";
export const Graph = (props: GraphProps) => {
  const {
    options,
    selectedEdge,
    selectedAlgo,
    visualizationSpeed,
    setVisualizingState,
    setNodeSelection,
    nodeSelection,
    isVisualizing,
  } = props;
  const [nodes, setNodes] = useState<INode[]>([]);
  const [edges, setEdges] = useState<Map<number, IEdge[] | undefined>>(
    new Map<number, IEdge[]>()
  );
  const [isModalOpen, setModalState] = useState(false);
  const [edge, setEdge] = useState<IEdge | null>(null);
  const [pathFindingNode, setPathFindingNode] = useState<{
    startNodeId: number;
    endNodeId: number;
  } | null>(null);
  const [isPathPossible, setPathPossible] = useState(true);
  const [isTraversalPossible, setTraversalPossible] = useState(true);
  const [mockEdge, setMockEdge] = useState<IEdge | null>(null);
  const currentNode = useRef<any>();
  const currentEdge = useRef<any>();
  const nodesTillNow = useRef(0);
  const graph = useRef<any>();
  const isVisualizationDone = useRef(false);

  const resetNodesAndEdgesState = useCallback(() => {
    let updateNodes = nodes.map((node: INode) => {
      return { ...node, isInShortestPath: false, isVisited: false };
    });
    let updatedEdges = cloneDeep(edges);
    updatedEdges.forEach((list: IEdge[] | undefined, nodeId: number) => {
      let newList = list?.map((edge: IEdge) => {
        return {
          ...edge,
          isUsedInTraversal: false,
          isUsedInShortestPath: false,
        };
      });
      updatedEdges.set(nodeId, newList);
    });
    setNodes(updateNodes);
    setEdges(updatedEdges);
    setPathFindingNode(null);
    isVisualizationDone.current = false;
  }, [nodes, edges]);

  useEffect(() => {
    graph.current.addEventListener("touchmove", (e: any) => e.preventDefault());
  }, []);
  useEffect(() => {
    //deletes the graph from the board.
    if (options.reset) {
      setNodes([]);
      setEdges(new Map<number, IEdge[] | undefined>());
      nodesTillNow.current = 0;
      isVisualizationDone.current = false;
    }
  }, [options.reset]);

  useEffect(() => {
    //whenever the selected Algorithm changes, set pathfinding node to null.
    setPathFindingNode(null);
  }, [selectedAlgo]);

  useEffect(() => {
    //Whenever options change and the visualization is recently competed,reset the graph to its pre-visualized state.
    if (isVisualizationDone.current) {
      resetNodesAndEdgesState();
    }
  }, [options, resetNodesAndEdgesState]);

  //add a new node to the graph
  const addNode = (event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGSVGElement;
    let nodeX = event.clientX - target.getBoundingClientRect().left;
    let nodeY = event.clientY - target.getBoundingClientRect().top;
    nodesTillNow.current += 1;
    let newNode = {
      id: nodesTillNow.current,
      x: nodeX,
      y: nodeY,
      r: 30,
    };
    edges.set(nodesTillNow.current, []);
    setEdges(edges);
    setNodes([...nodes, newNode]);
  };

  //delete an existing node from the graph
  const deleteNode = (event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGSVGElement;
    let newNodes = nodes.filter(
      (node: INode) => node.id !== parseInt(target.id)
    );
    edges.forEach((list: IEdge[] | undefined, nodeId: number) => {
      let newList = list?.filter((edge: IEdge) => target.id !== edge.to);
      edges.set(nodeId, newList);
    });

    edges.delete(parseInt(target.id));
    setEdges(edges);
    setNodes(newNodes);
  };

  //handles the logic for setting nodes and edges state for visualization
  const visualizeSetState = (
    currentEdge: IEdge,
    edgeAttribute: string,
    nodeAttribute: string
  ) => {
    edges.forEach((list: IEdge[] | undefined) => {
      list?.forEach((edge: IEdge) => {
        if (
          edge.type === "directed" &&
          edge.from === currentEdge.from &&
          edge.to === currentEdge.to
        ) {
          edge[edgeAttribute] = true;
        }
        if (edge.type === "undirected") {
          if (edge.from === currentEdge.from && edge.to === currentEdge.to) {
            edge[edgeAttribute] = true;
            edges.get(parseInt(currentEdge.to))?.forEach((edge: IEdge) => {
              if (edge.to === currentEdge.from) {
                edge[edgeAttribute] = true;
              }
            });
          }
        }
      });
    });
    setEdges(edges);
    let updatedNodes = [...nodes];
    updatedNodes.forEach((node: INode) => {
      if (node.id === parseInt(currentEdge.to)) {
        node[nodeAttribute] = true;
      }
    });

    setNodes(updatedNodes);
  };

  //visualize shortest path logic
  const visualizeShortestPath = (shortestPath: IEdge[]) => {
    for (let i = 0; i <= shortestPath.length; i++) {
      if (i === shortestPath.length) {
        setTimeout(() => {
          setVisualizingState(false);
          setNodeSelection({
            ...nodeSelection,
            isStartNodeSelected: false,
            isEndNodeSelected: false,
          });
          isVisualizationDone.current = true;
        }, visualizationSpeed * i);
        return;
      }
      setTimeout(() => {
        const currentEdge: IEdge = shortestPath[i];
        const isNodeIsInShortedPath = nodes.some((node: INode) => {
          if (node.id === parseInt(currentEdge.to)) {
            return node.isInShortestPath === true;
          }
          return false;
        });
        if (!isNodeIsInShortedPath) {
          visualizeSetState(
            currentEdge,
            "isUsedInShortestPath",
            "isInShortestPath"
          );
        }
      }, visualizationSpeed * i);
    }
  };

  //visualize the visited nodes and shortestPath if applicable
  const visualizeGraph = (
    visitedEdges: IEdge[],
    shortestPath: IEdge[] = []
  ) => {
    setNodeSelection({
      ...nodeSelection,
      isStartNodeSelected: false,
      isEndNodeSelected: false,
    });
    setVisualizingState(true);
    for (let i = 0; i <= visitedEdges.length; i++) {
      if (i === visitedEdges.length) {
        setTimeout(() => {
          setPathFindingNode(null);
          visualizeShortestPath(shortestPath);
        }, visualizationSpeed * i);
        return;
      }

      setTimeout(() => {
        const currentEdge: IEdge = visitedEdges[i];
        const isNodeTraversed = nodes.some((node: INode) => {
          if (node.id === parseInt(currentEdge.to)) {
            return node.isVisited === true;
          }
          return false;
        });
        if (!isNodeTraversed) {
          visualizeSetState(currentEdge, "isUsedInTraversal", "isVisited");
        }
      }, visualizationSpeed * i);
    }
  };

  //common handler for adding new nodes,deleting existing nodes and selecting nodes for visualization
  const handleSelect = (event: React.MouseEvent<SVGSVGElement>) => {
    const target = event.target as SVGSVGElement;
    const isNode = target.tagName === "circle";
    if (options.drawNode && !isNode) {
      addNode(event);
    } else if (options.deleteNode && isNode) {
      deleteNode(event);
    } else if (selectedAlgo?.data === "traversal" && isNode && !isVisualizing) {
      const startNodeId = parseInt(target.id);
      if (selectedAlgo?.key === "bfs") {
        let visitedEdges = bfs(edges, startNodeId);
        visualizeGraph(visitedEdges);
      } else if (selectedAlgo?.key === "dfs") {
        let visitedEdges = dfs(edges, startNodeId);
        visualizeGraph(visitedEdges);
      } else if (selectedAlgo.key === "minspantreeprims") {
        let visitedEdges = minspantreeprims(edges, nodes, startNodeId);
        if (visitedEdges.length !== 0) visualizeGraph(visitedEdges);
        else {
          setTraversalPossible(false);
          setVisualizingState(true);
          setNodeSelection({
            ...nodeSelection,
            isStartNodeSelected: false,
            isEndNodeSelected: false,
          });
          setTimeout(() => {
            setTraversalPossible(true);
            setVisualizingState(false);
          }, 2500);
        }
      }
    } else if (
      selectedAlgo?.data === "pathfinding" &&
      isNode &&
      !isVisualizing
    ) {
      if (!pathFindingNode) {
        setPathFindingNode({ startNodeId: parseInt(target.id), endNodeId: -1 });
      } else {
        const startNodeId = pathFindingNode.startNodeId;
        const endNodeId = parseInt(target.id);
        setPathFindingNode({ ...pathFindingNode, endNodeId });
        let output: IPathFinding | undefined = dijkstra(
          edges,
          startNodeId,
          endNodeId
        );
        if (output?.shortestPath.length !== 0 && output?.visitedEdges) {
          visualizeGraph(output.visitedEdges, output.shortestPath);
        } else {
          setPathPossible(false);
          setVisualizingState(true);
          setNodeSelection({
            ...nodeSelection,
            isStartNodeSelected: false,
            isEndNodeSelected: false,
          });
          setTimeout(() => {
            setPathPossible(true);
            setVisualizingState(false);
            setPathFindingNode(null);
          }, 2500);
        }
      }
    }
  };

  //updates node coordinates when moving it
  const updateNodeCoord = (x: number, y: number) => {
    let newNodes = nodes.map((node: INode) => {
      if (node.id === parseInt(currentNode.current.id)) {
        return { ...node, x, y };
      }
      return node;
    });
    setNodes(newNodes);
  };
  //updates edge coordinates when moving nodes
  const updateEdgeCoord = (x: number, y: number) => {
    let newBegEdgePositionsForNode: IEdge[] | undefined = edges
      ?.get(parseInt(currentNode.current.id))
      ?.map((edge: IEdge) => {
        let { tempX, tempY } = calculateAccurateCoords(
          x,
          y,
          edge.nodeX2,
          edge.nodeY2
        );
        return { ...edge, x1: x, y1: y, x2: tempX, y2: tempY };
      });
    edges.set(parseInt(currentNode.current.id), newBegEdgePositionsForNode);
    edges.forEach((list: IEdge[] | undefined, nodeId: number) => {
      let newList = list?.map((edge: IEdge) => {
        if (currentNode.current.id === edge.to) {
          let { tempX, tempY } = calculateAccurateCoords(
            edge.x1,
            edge.y1,
            edge.nodeX2,
            edge.nodeY2
          );
          return { ...edge, x2: tempX, y2: tempY, nodeX2: x, nodeY2: y };
        }
        return edge;
      });
      edges.set(nodeId, newList);
    });

    setEdges(edges);
  };

  //add a new edge between two nodes
  const addEdge = (id: string, tagName: string, x: number, y: number) => {
    if (currentEdge.current) {
      let x1 = currentEdge.current.x1;
      let y1 = currentEdge.current.y1;
      let x2 = x;
      let y2 = y;
      let nodeX2 = x2;
      let nodeY2 = y2;
      currentEdge.current.to = id;
      const isEdgeNotPresent =
        edges?.get(parseInt(currentEdge.current.from))?.length !== 0
          ? edges
              ?.get(parseInt(currentEdge.current.from))
              ?.every((edge: IEdge) => edge.to !== currentEdge.current.to)
          : true;
      const isNotCurrentNode =
        currentEdge.current.from !== currentEdge.current.to;
      const isEdgePossible = isEdgeNotPresent && isNotCurrentNode;
      if (isEdgePossible) {
        if (selectedEdge?.key === "directed") {
          let { tempX: tempX2, tempY: tempY2 } = calculateAccurateCoords(
            x1,
            y1,
            x2,
            y2
          );
          const fromNodeId = parseInt(currentEdge.current.from);
          let { ...toNode } = currentEdge.current;
          toNode.x2 = tempX2;
          toNode.y2 = tempY2;
          toNode.nodeX2 = nodeX2;
          toNode.nodeY2 = nodeY2;
          toNode.type = "directed";
          edges?.get(fromNodeId)?.push(toNode);
        } else if (selectedEdge?.key === "undirected") {
          const fromNodeId = parseInt(currentEdge.current.from);
          const toNodeId = parseInt(currentEdge.current.to);
          const isUndirectedEdgeNotPossible =
            edges
              ?.get(fromNodeId)
              ?.some((edge: IEdge) => parseInt(edge.to) === toNodeId) ||
            edges
              ?.get(toNodeId)
              ?.some((edge: IEdge) => parseInt(edge.to) === fromNodeId);
          if (!isUndirectedEdgeNotPossible) {
            let { tempX: tempX2, tempY: tempY2 } = calculateAccurateCoords(
              x1,
              y1,
              x2,
              y2
            );
            let { ...toNode } = currentEdge.current;
            toNode.x2 = tempX2;
            toNode.y2 = tempY2;
            toNode.nodeX2 = nodeX2;
            toNode.nodeY2 = nodeY2;
            toNode.type = "undirected";
            edges?.get(fromNodeId)?.push(toNode);
            let { tempX: tempX1, tempY: tempY1 } = calculateAccurateCoords(
              x2,
              y2,
              x1,
              y1
            );
            let fromNode = {
              x1: x2,
              y1: y2,
              x2: tempX1,
              y2: tempY1,
              nodeX2: x1,
              nodeY2: y1,
              from: currentEdge.current.to,
              to: currentEdge.current.from,
              type: "undirected",
              weight: currentEdge.current.weight,
            };
            edges?.get(toNodeId)?.push(fromNode);
          }
        }
        setEdges(edges);
      }
    }
  };

  //common handler for deletion and edition of edges.
  const handleEdge = (edge: IEdge, fromNode: INode) => {
    if (options.deleteEdge) {
      deleteEdge(edge, fromNode.id);
    } else if (options.editEdge) {
      editEdge(edge, fromNode);
    }
  };

  //delete edge functionality
  const deleteEdge = (currentEdge: IEdge, fromNode: number) => {
    if (currentEdge.type === "directed") {
      let upgradedEdges = edges
        ?.get(fromNode)
        ?.filter((edge: IEdge) => edge.to !== currentEdge.to);
      let newEdges = new Map(edges);
      newEdges.set(fromNode, upgradedEdges);
      setEdges(newEdges);
    } else if (currentEdge.type === "undirected") {
      let upgradedOutgoingEdges = edges
        ?.get(fromNode)
        ?.filter((edge: IEdge) => edge.to !== currentEdge.to);
      let upgradedIncomingEdges = edges
        ?.get(parseInt(currentEdge.to))
        ?.filter((edge: IEdge) => edge.to !== fromNode.toString());
      let newEdges = new Map(edges);
      newEdges.set(fromNode, upgradedOutgoingEdges);
      newEdges.set(parseInt(currentEdge.to), upgradedIncomingEdges);
      setEdges(newEdges);
    }
  };

  //function called when edit Edge button is clicked.
  const editEdge = (edge: IEdge, fromNode: any) => {
    currentNode.current = { ...fromNode };
    setEdge(edge);
    setModalState(true);
  };

  //function that actually contains the logic for setting weight of selected edge.
  const editEdgeWeight = () => {
    let currentEdge: IEdge = { ...edge } as IEdge;
    if (edge?.type === "directed") {
      let upgradedEdges = edges
        ?.get(currentNode.current.id)
        ?.map((edge: IEdge) => {
          if (edge.to === currentEdge.to) {
            return { ...edge, weight: currentEdge.weight };
          }
          return edge;
        });
      let newEdges = new Map(edges);
      newEdges.set(currentNode.current.id, upgradedEdges);
      setEdges(newEdges);
    } else if (edge?.type === "undirected") {
      let upgradedOutgoingEdges = edges
        ?.get(currentNode.current.id)
        ?.map((edge: IEdge) => {
          if (edge.to === currentEdge.to) {
            return { ...edge, weight: currentEdge.weight };
          }
          return edge;
        });
      let upgradedIncomingEdges = edges
        ?.get(parseInt(currentEdge.to))
        ?.map((edge: IEdge) => {
          if (edge.to === currentNode.current.id.toString()) {
            return { ...edge, weight: currentEdge.weight };
          }
          return edge;
        });
      let newEdges = new Map(edges);
      newEdges.set(currentNode.current.id, upgradedOutgoingEdges);
      newEdges.set(parseInt(currentEdge.to), upgradedIncomingEdges);
      setEdges(newEdges);
    }
    setModalState(false);
  };

  //common handler for movement related operations - moving node and drawing edges.
  const handleMove = (event: React.MouseEvent<SVGCircleElement>) => {
    let canMoveNode = options.moveNode;
    let canDrawEdge =
      selectedEdge?.key &&
      (selectedEdge.key === "directed" || selectedEdge.key === "undirected");
    if (canMoveNode) {
      currentNode.current = event.target;

      //logic for movement of nodes.
      const handleNodeMove = (event: any) => {
        let nodeX = event.clientX - graph.current.getBoundingClientRect().left;
        let nodeY = event.clientY - graph.current.getBoundingClientRect().top;
        currentNode.current.setAttribute("cx", nodeX);
        currentNode.current.setAttribute("cy", nodeY);
        currentNode.current.nextElementSibling.setAttribute("x", nodeX);
        currentNode.current.nextElementSibling.setAttribute("y", nodeY + 5);
        updateNodeCoord(nodeX, nodeY);
        updateEdgeCoord(nodeX, nodeY);
      };
      //function triggered to remove mouse event listeners.
      const handleNodeEnd = () => {
        graph.current.removeEventListener("pointermove", handleNodeMove);
        graph.current.removeEventListener("pointerup", handleNodeEnd);
      };
      graph.current.addEventListener("pointermove", handleNodeMove);
      graph.current.addEventListener("pointerup", handleNodeEnd);
    } else if (canDrawEdge) {
      currentNode.current = event.target;
      //logic for drawing of edges.
      const handleArrowMove = (event: any) => {
        let arrowX = event.clientX - graph.current.getBoundingClientRect().left;
        let arrowY = event.clientY - graph.current.getBoundingClientRect().top;
        currentEdge.current = {
          x1: parseInt(currentNode.current.getAttribute("cx")),
          y1: parseInt(currentNode.current.getAttribute("cy")),
          x2: arrowX,
          y2: arrowY,
          from: currentNode.current.id,
          to: "",
          weight: 0,
        };
        setMockEdge(currentEdge.current);
      };
      //function triggered to remove mouse event listeners.
      const handleArrowEnd = (event: React.PointerEvent<SVGSVGElement>) => {
        const isTouchEvent = event.pointerType === "touch";
        if (isTouchEvent) {
          const node = findToNodeForTouchBasedDevices(
            event.clientX - graph.current.getBoundingClientRect().left,
            event.clientY - graph.current.getBoundingClientRect().top,
            nodes
          );
          if (node) {
            addEdge(node.id.toString(), "circle", node.x, node.y);
          }
        } else {
          const target = event.target as SVGSVGElement;
          const isNode = target.tagName === "circle";
          if (isNode) {
            const x = parseInt(target.getAttribute("cx")!);
            const y = parseInt(target.getAttribute("cy")!);
            addEdge(target.id, "circle", x, y);
          }
        }
        setMockEdge(null);
        currentEdge.current = undefined;
        graph.current.removeEventListener("pointermove", handleArrowMove);
        graph.current.removeEventListener("pointerup", handleArrowEnd);
      };
      graph.current.addEventListener("pointermove", handleArrowMove);
      graph.current.addEventListener("pointerup", handleArrowEnd);
    }
  };
  return (
    <>
      {selectedAlgo?.data === "traversal" &&
        (isTraversalPossible ? (
          <MessageBar
            className={styles.traversal}
            isMultiline={false}
            dismissButtonAriaLabel="Close"
            styles={{ text: { fontWeight: "bold", fontSize: "14px" } }}
          >
            {algoMessages[selectedAlgo?.data][selectedAlgo.key]["info"]}
          </MessageBar>
        ) : (
          <MessageBar
            className={styles.pathError}
            messageBarType={MessageBarType.error}
            isMultiline={false}
            dismissButtonAriaLabel="Close"
            styles={{ text: { fontWeight: "bold", fontSize: "14px" } }}
          >
            {algoMessages[selectedAlgo?.data][selectedAlgo.key]["failure"]}
          </MessageBar>
        ))}
      {selectedAlgo?.data === "pathfinding" &&
        (isPathPossible ? (
          <MessageBar
            className={styles.pathfinding}
            isMultiline={false}
            dismissButtonAriaLabel="Close"
            styles={{ text: { fontWeight: "bold", fontSize: "14px" } }}
          >
            {algoMessages[selectedAlgo?.data][selectedAlgo.key]["info"]}
          </MessageBar>
        ) : (
          <MessageBar
            className={styles.pathError}
            messageBarType={MessageBarType.error}
            isMultiline={false}
            dismissButtonAriaLabel="Close"
            styles={{ text: { fontWeight: "bold", fontSize: "14px" } }}
          >
            {algoMessages[selectedAlgo?.data][selectedAlgo.key]["failure"]}
          </MessageBar>
        ))}
      <svg ref={graph} className={styles.graph} onClick={handleSelect}>
        {nodes.map((node: INode) => (
          <Node
            handleEdge={handleEdge}
            handleMove={handleMove}
            key={node.id}
            node={node}
            edges={edges}
            deleteEdgeMode={options.deleteEdge}
            deleteNodeMode={options.deleteNode}
            editEdgeMode={options.editEdge}
            readyForVisualization={nodeSelection.isStartNodeSelected}
            readyForMovement={options.moveNode}
            readyForEdge={selectedEdge?.key !== "select"}
            pathFindingNode={pathFindingNode}
          />
        ))}
        {mockEdge && (
          <>
            {selectedEdge?.key === "directed" && (
              <marker
                className={styles.mockArrow}
                id="mockArrowHead"
                markerWidth="10"
                markerHeight="7"
                refX="0"
                refY="3.5"
                orient="auto"
              >
                <polygon points="0 0, 10 3.5, 0 7" />
              </marker>
            )}
            <line
              className={styles.mockEdge}
              x1={mockEdge.x1}
              y1={mockEdge.y1}
              x2={mockEdge.x2}
              y2={mockEdge.y2}
              markerEnd="url(#mockArrowHead)"
            ></line>
          </>
        )}
      </svg>
      <Modal
        styles={{
          main: { minHeight: "0px", minWidth: "0px", height: "31px" },
          scrollableContent: { display: "flex" },
        }}
        isOpen={isModalOpen}
      >
        {edge && edge.weight !== null && (
          <TextField
            styles={{ fieldGroup: { border: "none" } }}
            type="number"
            min={0}
            max={500}
            value={edge.weight.toString()}
            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
              if (e.keyCode === 13) {
                editEdgeWeight();
              }
            }}
            onChange={(e: React.ChangeEvent<any>) => {
              parseInt(e.target.value) >= 0 && parseInt(e.target.value) <= 500
                ? setEdge({ ...edge, weight: parseInt(e.target.value) })
                : e.preventDefault();
            }}
          />
        )}

        <button className={styles.modalButton} onClick={editEdgeWeight}>
          Set Weight
        </button>
      </Modal>
    </>
  );
};
