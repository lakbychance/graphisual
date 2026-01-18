import { createHistoryStore } from "./historyStore";
import { GraphSnapshot } from "../components/Graph/IGraph";

const areSnapshotsEqual = (a: GraphSnapshot, b: GraphSnapshot): boolean => {
  return JSON.stringify(a) === JSON.stringify(b);
};

export const useGraphHistoryStore = createHistoryStore<GraphSnapshot>({
  name: "GraphHistoryStore",
  areEqual: areSnapshotsEqual,
});
