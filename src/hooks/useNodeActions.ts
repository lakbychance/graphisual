import { toast } from "sonner";
import { useGraphStore } from "../store/graphStore";
import { phoneNodeLimit } from "./useMediaQuery";

interface UseNodeActionsReturn {
  /** Adds a node on the canvas; on a phone at its limit (D71), says so instead. Returns whether it was added. */
  addNode: (x: number, y: number) => boolean;
  moveNode: (nodeId: number, x: number, y: number) => void;
  selectNode: (nodeId: number | null) => void;
}

/** One note, however often a full phone is tapped. */
const PHONE_FULL_TOAST = "phone-node-limit";

export function useNodeActions(): UseNodeActionsReturn {
  const moveNode = useGraphStore((state) => state.moveNode);
  const selectNode = useGraphStore((state) => state.selectNode);

  const addNode = (x: number, y: number) => {
    const limit = phoneNodeLimit();
    if (useGraphStore.getState().addNode(x, y, limit)) return true;
    toast(`Phones hold up to ${limit} nodes — a bigger screen holds more`, { id: PHONE_FULL_TOAST });
    return false;
  };

  return { addNode, moveNode, selectNode };
}
