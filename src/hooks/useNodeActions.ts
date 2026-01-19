import { useGraphStore } from "../store/graphStore";

interface UseNodeActionsReturn {
  addNode: (x: number, y: number) => void;
  moveNode: (nodeId: number, x: number, y: number) => void;
  selectNode: (nodeId: number | null) => void;
}

export function useNodeActions(): UseNodeActionsReturn {
  const addNode = useGraphStore((state) => state.addNode);
  const moveNode = useGraphStore((state) => state.moveNode);
  const selectNode = useGraphStore((state) => state.selectNode);

  return { addNode, moveNode, selectNode };
}
