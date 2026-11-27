/**
 * Shows the message the app gives instead of a run (`buildRun`), as a toast. When the graph lacks a
 * fact the algorithm needs, the edge or nodes that show it light on the canvas while the toast stays.
 */
import { toast } from "sonner";
import { useGraphStore } from "../../store/graphStore";
import type { BuiltRun } from "./buildRun";

export function sayProblem({ problem, severity, evidence }: Extract<BuiltRun, { problem: string }>) {
  const show = severity === "warning" ? toast.warning : toast.error;
  if (!evidence) {
    show(problem);
    return;
  }
  const putOut = useGraphStore.getState().showEvidence(evidence);
  show(problem, { onDismiss: putOut, onAutoClose: putOut });
}
