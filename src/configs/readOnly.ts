import { IDropdownOption, DropdownMenuItemType } from "@fluentui/react";
export const edgeOptions: Array<IDropdownOption> = [
  {
    key: "select",
    text: "Select Edge",
  },
  {
    key: "directed",
    text: "Directed",
  },
  {
    key: "undirected",
    text: "Undirected",
  },
];
export const algoOptions: Array<IDropdownOption> = [
  {
    key: "select",
    text: "Select Algorithm",
  },
  { key: "divider_1", text: "-", itemType: DropdownMenuItemType.Divider },
  {
    key: "traversal",
    text: "Traversal",
    itemType: DropdownMenuItemType.Header,
  },
  {
    key: "bfs",
    data: "traversal",
    text: "Breath First Search",
  },
  {
    key: "dfs",
    data: "traversal",
    text: "Depth First Search",
  },
  {
    key: "minspantreeprims",
    data: "traversal",
    text: "Minimum Spanning Tree",
  },
  { key: "divider_2", text: "-", itemType: DropdownMenuItemType.Divider },
  {
    key: "pathfinding",
    text: "Pathfinding",
    itemType: DropdownMenuItemType.Header,
  },
  {
    key: "dijkstra",
    data: "pathfinding",
    text: "Dijkstra",
  },
];

export const algoMessages = {
  traversal: {
    bfs: {
      info: "Click on any node to begin the traversal.",
    },
    dfs: {
      info: "Click on any node to begin the traversal.",
    },
    minspantreeprims: {
      info:
        "Click on any node to see the minimum spanning tree. Works only on connected undirected graphs.",
      failure: "Graph violates the requirements of the algorithm.",
    },
  },
  pathfinding: {
    dijkstra: {
      info:
        "Select a starting node and ending node to visualize the pathfinding algorithm.",
      failure: "Path is not possible for the given vertices.",
    },
  },
} as any;
