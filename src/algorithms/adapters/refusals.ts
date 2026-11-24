/**
 * Why the app will not play a run: shared by the pathfinding adapters' `refusal`.
 */
import type { AlgorithmEvent, RouteAnswer } from "../engine";
import type { AlgorithmInput } from "../types";

/**
 * A pathfinding refusal: there is no destination, or the run found no route to it. `message` says
 * why there is no route (a fixed message, or one built from the answer).
 */
export const noRoute = (message: string | ((answer: RouteAnswer) => string)) =>
  (events: AlgorithmEvent[], input: AlgorithmInput): string | undefined => {
    if (input.endNodeId === undefined) return "End node is required for pathfinding.";
    const answer = events.find((e): e is RouteAnswer => e.type === "answer" && e.kind === "route");
    if (!answer || answer.path !== null) return undefined;
    return typeof message === "string" ? message : message(answer);
  };
