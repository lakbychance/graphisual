import { useState } from "react";
import { Button } from "@/components/ui-sdk";

const HINTS = [
  ["Click a node to start BFS", "bfs"],
  ["Pick a start node", "dijkstra"],
  ["Now pick the end node", "dijkstra-2"],
] as const;

/** Algorithm hint pill: inset ring pulses whenever the hint changes. */
export function AlgorithmHintDemo() {
  const [i, setI] = useState(0);
  const [text, key] = HINTS[i];
  return (
    <div className="flex flex-col items-center gap-3">
      <div key={key} className="gs-hint" role="status">{text}</div>
      <Button size="sm" variant="ghost" tone="muted" onClick={() => setI((n) => (n + 1) % HINTS.length)}>Next hint</Button>
    </div>
  );
}
