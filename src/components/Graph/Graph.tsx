import React, { useState, useRef, useEffect } from "react";
import { Node } from "../Graph/Node/Node";
import styles from "./Graph.module.css";
import { calculateAccurateCoords } from "../../utility/calc";
import { Modal, TextField, MessageBar, MessageBarType } from "@fluentui/react";
import { bfs, dfs, dijkstra } from "../../algorithms/algorithm";
export const Graph = (props: any) => {
  const {
    options,
    selectedEdge,
    selectedAlgo,
    setOptions,
    visualizationSpeed,
    setVisualizingState,
  } = props;
  const [nodes, setNodes] = useState<any>([]);
  const [edges, setEdges] = useState<any>(new Map());
  const [isModalOpen, setModalState] = useState(false);
  const [edge, setEdge] = useState<any>();
  const [pathFindingNode, setPathFindingNode] = useState<any>(null);
  const [isPathPossible, setPathPossible] = useState(true);
  const currentNode = useRef<any>();
  const currentEdge = useRef<any>();
  const nodesTillNow = useRef(0);
  const graph = useRef<any>();
  const [mockEdge, setMockEdge] = useState<any>(null);

  useEffect(() => {
    if (options.reset) {
      setNodes([]);
      setEdges(new Map());
      nodesTillNow.current = 0;
    }
  }, [options.reset]);

  useEffect(() => {
    setPathFindingNode(null);
  }, [options]);

  const addNode = (event: any) => {
    let nodeX = event.clientX - event.target.getBoundingClientRect().left;
    let nodeY = event.clientY - event.target.getBoundingClientRect().top;
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
  const deleteNode = (event: any) => {
    let newNodes = nodes.filter(
      (node: any) => node.id !== parseInt(event.target.id)
    );
    for (const [node, list] of edges.entries()) {
      let newList = list.filter((edge: any) => {
        if (event.target.id !== edge.to) {
          return edge;
        }
      });
      edges.set(node, newList);
    }
    edges.delete(parseInt(event.target.id));
    setEdges(edges);
    setNodes(newNodes);
  };
  const visualizeShortestPath = (shortestPath: any) => {
    for (let i = 0; i <= shortestPath.length; i++) {
      if (i === shortestPath.length) {
        setTimeout(() => {
          let updateNodes = nodes.map((node: any) => {
            return { ...node, isInShortestPath: false, isVisited: false };
          });
          setNodes(updateNodes);
          setOptions({ ...options, selectStartNode: true });
          setVisualizingState(false);
        }, visualizationSpeed * i);
        return;
      }
      setTimeout(() => {
        const currentNodeId = shortestPath[i];
        let updatedNodes = [...nodes];
        updatedNodes.forEach((node: any) => {
          if (node.id === currentNodeId) {
            node.isInShortestPath = true;
            node.isVisited = false;
          }
        });
        setNodes(updatedNodes);
      }, visualizationSpeed * i);
    }
  };
  const visualizeGraph = (visitedNodes: any, shortestPath: any = []) => {
    setOptions({ ...options, selectStartNode: false });
    setVisualizingState(true);
    for (let i = 0; i <= visitedNodes.length; i++) {
      if (i === visitedNodes.length) {
        setTimeout(() => {
          visualizeShortestPath(shortestPath);
        }, visualizationSpeed * i);
        return;
      }
      setTimeout(() => {
        const currentNodeId = visitedNodes[i];
        let updatedNodes = [...nodes];
        updatedNodes.forEach((node: any) => {
          if (node.id === currentNodeId) {
            node.isVisited = true;
          }
        });
        setNodes(updatedNodes);
      }, visualizationSpeed * i);
    }
  };
  const handleSelect = (event: any) => {
    if (
      options.drawNode &&
      !event.target?.className?.baseVal?.includes("Node")
    ) {
      addNode(event);
    } else if (
      options.deleteNode &&
      event.target?.className?.baseVal?.includes("Node")
    ) {
      deleteNode(event);
    } else if (
      options.selectStartNode &&
      !options.selectEndNode &&
      event.target?.className?.baseVal?.includes("Node")
    ) {
      const startNode = nodes.filter(
        (node: any) => node.id === parseInt(event.target.id)
      )[0];
      if (startNode && startNode.id) {
        if (selectedAlgo.key === "bfs") {
          let visitedNodes = bfs(edges, startNode.id);
          visualizeGraph(visitedNodes);
        } else if (selectedAlgo.key === "dfs") {
          let visitedNodes = dfs(edges, startNode.id);
          visualizeGraph(visitedNodes);
        }
      }
    } else if (
      options.selectStartNode &&
      options.selectEndNode &&
      event.target?.className?.baseVal?.includes("Node") &&
      event.target.tagName === "circle"
    ) {
      if (!pathFindingNode) {
        setPathFindingNode(parseInt(event.target.id));
      } else {
        let { shortestPath, visitedNodes }: any = dijkstra(
          edges,
          pathFindingNode,
          parseInt(event.target.id),
          nodes
        );
        if (shortestPath.length !== 0) {
          visualizeGraph(visitedNodes, shortestPath);
        } else {
          setPathPossible(false);
          setTimeout(() => {
            setPathPossible(true);
          }, 2500);
        }
        setPathFindingNode(null);
      }
    }
  };

  //updates node coordinates when moving it
  const updateNodeCoord = (x: number, y: number) => {
    let newNodes = nodes.map((node: any) => {
      if (node.id === parseInt(currentNode.current.id)) {
        return { ...node, x, y };
      }
      return node;
    });
    setNodes(newNodes);
  };
  //updates edge coordinates when moving nodes
  const updateEdgeCoord = (x: number, y: number) => {
    let newBegEdgePositionsForNode = edges
      .get(parseInt(currentNode.current.id))
      .map((edge: any) => {
        let { tempX, tempY } = calculateAccurateCoords(
          x,
          y,
          edge.nodeX2,
          edge.nodeY2
        );
        return { ...edge, x1: x, y1: y, x2: tempX, y2: tempY };
      });
    edges.set(parseInt(currentNode.current.id), newBegEdgePositionsForNode);
    for (const [node, list] of edges.entries()) {
      let newList = list.map((edge: any) => {
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
      edges.set(node, newList);
    }
    setEdges(edges);
  };

  const addEdge = (event: any) => {
    if (event.target?.className?.baseVal?.includes("node")) {
      if (currentEdge.current) {
        let x1 = currentEdge.current.x1;
        let y1 = currentEdge.current.y1;
        let x2 = parseInt(event.target.getAttribute("cx"));
        let y2 = parseInt(event.target.getAttribute("cy"));
        let nodeX2 = x2;
        let nodeY2 = y2;
        currentEdge.current.to = event.target.id;
        const isEdgeNotPresent =
          edges.get(parseInt(currentEdge.current.from)).length !== 0
            ? edges
                .get(parseInt(currentEdge.current.from))
                .every((edge: any) => edge.to !== currentEdge.current.to)
            : true;
        const isNotCurrentNode =
          currentEdge.current.from !== currentEdge.current.to;
        const isEdgePossible = isEdgeNotPresent && isNotCurrentNode;
        if (isEdgePossible) {
          if (selectedEdge.key === "directed") {
            let { tempX: tempX2, tempY: tempY2 } = calculateAccurateCoords(
              x1,
              y1,
              x2,
              y2
            );
            const fromNodeId = parseInt(currentEdge.current.from);
            let { from, ...toNode } = currentEdge.current;
            toNode.x2 = tempX2;
            toNode.y2 = tempY2;
            toNode.nodeX2 = nodeX2;
            toNode.nodeY2 = nodeY2;
            toNode.type = "directed";
            edges.get(fromNodeId).push(toNode);
          } else if (selectedEdge.key === "undirected") {
            const fromNodeId = parseInt(currentEdge.current.from);
            const toNodeId = parseInt(currentEdge.current.to);
            const isUndirectedEdgeNotPossible =
              edges
                .get(fromNodeId)
                .some((edge: any) => parseInt(edge.to) === toNodeId) ||
              edges
                .get(toNodeId)
                .some((edge: any) => parseInt(edge.to) === fromNodeId);
            if (!isUndirectedEdgeNotPossible) {
              let { tempX: tempX2, tempY: tempY2 } = calculateAccurateCoords(
                x1,
                y1,
                x2,
                y2
              );
              let { from, ...toNode } = currentEdge.current;
              toNode.x2 = tempX2;
              toNode.y2 = tempY2;
              toNode.nodeX2 = nodeX2;
              toNode.nodeY2 = nodeY2;
              toNode.type = "undirected";
              edges.get(fromNodeId).push(toNode);
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
                to: currentEdge.current.from,
                type: "undirected",
                weight: currentEdge.current.weight,
              };
              edges.get(toNodeId).push(fromNode);
            }
          }
          setEdges(edges);
        }
      }
    }
    setMockEdge(null);
    currentEdge.current = undefined;
  };
  const handleEdge = (edge: any, fromNode: any) => {
    if (options.deleteEdge) {
      deleteEdge(edge, fromNode.id);
    } else if (options.editEdge) {
      editEdge(edge, fromNode);
    }
  };
  const deleteEdge = (currentEdge: any, fromNode: number) => {
    if (currentEdge.type === "directed") {
      let upgradedEdges = edges
        .get(fromNode)
        .filter((edge: any) => edge.to !== currentEdge.to);
      let newEdges = new Map(edges);
      newEdges.set(fromNode, upgradedEdges);
      setEdges(newEdges);
    } else if (currentEdge.type === "undirected") {
      let upgradedOutgoingEdges = edges
        .get(fromNode)
        .filter((edge: any) => edge.to !== currentEdge.to);
      let upgradedIncomingEdges = edges
        .get(parseInt(currentEdge.to))
        .filter((edge: any) => edge.to !== fromNode.toString());
      let newEdges = new Map(edges);
      newEdges.set(fromNode, upgradedOutgoingEdges);
      newEdges.set(parseInt(currentEdge.to), upgradedIncomingEdges);
      setEdges(newEdges);
    }
  };
  const editEdge = (edge: any, fromNode: any) => {
    currentNode.current = { ...fromNode };
    setEdge(edge);
    setModalState(true);
  };
  const editEdgeWeight = () => {
    let currentEdge = { ...edge };
    if (edge.type === "directed") {
      let upgradedEdges = edges.get(currentNode.current.id).map((edge: any) => {
        if (edge.to === currentEdge.to) {
          return { ...edge, weight: currentEdge.weight };
        }
        return edge;
      });
      let newEdges = new Map(edges);
      newEdges.set(currentNode.current.id, upgradedEdges);
      setEdges(newEdges);
    } else if (edge.type === "undirected") {
      let upgradedOutgoingEdges = edges
        .get(currentNode.current.id)
        .map((edge: any) => {
          if (edge.to === currentEdge.to) {
            return { ...edge, weight: currentEdge.weight };
          }
          return edge;
        });
      let upgradedIncomingEdges = edges
        .get(parseInt(currentEdge.to))
        .map((edge: any) => {
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
  const handleMove = (event: any) => {
    let canMoveNode = options.moveNode;
    let canDrawEdge =
      selectedEdge.key &&
      (selectedEdge.key === "directed" || selectedEdge.key === "undirected");
    if (canMoveNode) {
      currentNode.current = event.target;
      const handleNodeMove = (event: any) => {
        let nodeX = event.offsetX;
        let nodeY = event.offsetY;
        currentNode.current.setAttribute("cx", nodeX);
        currentNode.current.setAttribute("cy", nodeY);
        currentNode.current.nextElementSibling.setAttribute("x", nodeX);
        currentNode.current.nextElementSibling.setAttribute("y", nodeY + 5);
        updateNodeCoord(nodeX, nodeY);
        updateEdgeCoord(nodeX, nodeY);
      };
      const handleNodeEnd = (event: any) => {
        graph.current.removeEventListener("mousemove", handleNodeMove);
        graph.current.removeEventListener("mouseup", handleNodeEnd);
      };
      graph.current.addEventListener("mousemove", handleNodeMove);
      graph.current.addEventListener("mouseup", handleNodeEnd);
    } else if (canDrawEdge) {
      currentNode.current = event.target;
      const handleArrowMove = (event: any) => {
        let arrowX = event.offsetX;
        let arrowY = event.offsetY;
        currentEdge.current = {
          x1: parseInt(currentNode.current.getAttribute("cx")),
          y1: parseInt(currentNode.current.getAttribute("cy")),
          x2: arrowX,
          y2: arrowY,
          from: currentNode.current.id,
          to: null,
          weight: 0,
        };
        setMockEdge(currentEdge.current);
      };
      const handleArrowEnd = (event: any) => {
        addEdge(event);
        graph.current.removeEventListener("mousemove", handleArrowMove);
        graph.current.removeEventListener("mouseup", handleArrowEnd);
      };
      graph.current.addEventListener("mousemove", handleArrowMove);
      graph.current.addEventListener("mouseup", handleArrowEnd);
    }
  };
  return (
    <>
      {options.selectStartNode && !options.selectEndNode && (
        <MessageBar
          className={styles.traversal}
          isMultiline={false}
          dismissButtonAriaLabel="Close"
          styles={{ text: { fontWeight: "bold", fontSize: "14px" } }}
        >
          Click on any node to begin the traversal.
        </MessageBar>
      )}
      {options.selectStartNode &&
        options.selectEndNode &&
        (isPathPossible ? (
          <MessageBar
            className={styles.pathfinding}
            isMultiline={false}
            dismissButtonAriaLabel="Close"
            styles={{ text: { fontWeight: "bold", fontSize: "14px" } }}
          >
            Select a starting node and ending node to visualize the pathfinding
            algorithm.
          </MessageBar>
        ) : (
          <MessageBar
            className={styles.pathError}
            messageBarType={MessageBarType.error}
            isMultiline={false}
            dismissButtonAriaLabel="Close"
            styles={{ text: { fontWeight: "bold", fontSize: "14px" } }}
          >
            Path is not possible for the given vertices.
          </MessageBar>
        ))}
      <svg ref={graph} className={styles.graph} onClick={handleSelect}>
        {nodes.map((node: any) => (
          <Node
            handleEdge={handleEdge}
            handleMove={handleMove}
            key={node.id}
            node={node}
            edges={edges}
            deleteEdgeMode={options.deleteEdge}
            deleteNodeMode={options.deleteNode}
            editEdgeMode={options.editEdge}
          />
        ))}
        {mockEdge && (
          <>
            {selectedEdge.key === "directed" && (
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
            value={edge.weight}
            onKeyDown={(e: any) => {
              if (e.keyCode === 13) {
                editEdgeWeight();
              }
            }}
            onChange={(e: any) => {
              if (
                parseInt(e.target.value) >= 0 &&
                parseInt(e.target.value) <= 500
              ) {
                setEdge({ ...edge, weight: parseInt(e.target.value) });
              }
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
