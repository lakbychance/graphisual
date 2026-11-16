import { useRef, useState } from "react";
import { ArrowLeftRight, Minus, MoveRight, Trash2 } from "lucide-react";
import {
  Button, Divider, Input, Label, Popover, PopoverContent, Stepper, Toggle, ToggleGroup, ToggleIcon, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";

type Point = { x: number; y: number };

/**
 * Edge popup: opens at the click point on an edge (ui-sdk `anchor` accepts a
 * point). Type toggle group, weight stepper (type, step, scrub, arrow keys),
 * reverse and delete.
 */
export function EdgePopupDemo() {
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [type, setType] = useState<"directed" | "undirected">("directed");
  const [weight, setWeight] = useState<number | null>(4);
  const [deleted, setDeleted] = useState(false);
  const open = anchor !== null;

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="260" height="90" viewBox="0 0 260 90" className="overflow-visible" aria-label="Demo edge; click the line to edit it">
        <defs>
          <marker id="pg-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="var(--edge-default, var(--color-edge-default))" />
          </marker>
        </defs>
        {!deleted && (
          <>
            <line x1="46" y1="45" x2="214" y2="45" stroke="transparent" strokeWidth="18" style={{ cursor: "pointer" }}
              onClick={(e) => setAnchor({ x: e.clientX, y: e.clientY })} />
            <line x1="46" y1="45" x2="214" y2="45" stroke="var(--edge-default, var(--color-edge-default))" strokeWidth="2" pointerEvents="none"
              markerEnd={type === "directed" ? "url(#pg-arrow)" : undefined} />
            <rect x="118" y="30" width="26" height="18" rx="3" fill="var(--color-surface)" stroke="var(--color-divider)" />
            <text x="131" y="43" textAnchor="middle" fontSize="11" fontWeight="600" fill="var(--color-text)" fontFamily="var(--value-font)">{weight ?? 0}</text>
          </>
        )}
        {[[26, 45, "A"], [234, 45, "B"]].map(([x, y, l]) => (
          <g key={String(l)}>
            <circle cx={Number(x)} cy={Number(y)} r="20" fill="var(--node-default, var(--gradient-default-start))" stroke="var(--node-stroke, var(--color-node-stroke))" strokeWidth="1.5" />
            <text x={Number(x)} y={Number(y) + 4} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--color-text)">{l}</text>
          </g>
        ))}
      </svg>
      {deleted ? (
        <Button size="sm" variant="outline" onClick={() => setDeleted(false)}>Restore edge</Button>
      ) : (
        <span className="gs-label">Click the edge</span>
      )}

      <Popover open={open} onOpenChange={(o) => !o && setAnchor(null)} modal>
        <PopoverContent side="top" sideOffset={10} anchor={anchor} className="p-2" aria-label="Edge controls" initialFocus=".gs-stepper-control">
          <div role="group" aria-label="Edge controls" className="flex items-center gap-2">
            <ToggleGroup aria-label="Edge type" value={[type]} deselectable={false} onValueChange={([v]) => v && setType(v as "directed" | "undirected")}>
              <Tooltip>
                <TooltipTrigger render={<Toggle value="directed" aria-label="Directed edge" />}><ToggleIcon><MoveRight /></ToggleIcon></TooltipTrigger>
                <TooltipContent side="bottom">Directed</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger render={<Toggle value="undirected" aria-label="Undirected edge" />}><ToggleIcon><Minus /></ToggleIcon></TooltipTrigger>
                <TooltipContent side="bottom">Undirected</TooltipContent>
              </Tooltip>
            </ToggleGroup>
            <Divider />
            <Stepper label="Edge weight" value={weight} onValueChange={setWeight} min={-999} max={999} controlClassName="w-12" />
            <Divider />
            {type === "directed" && (
              <Tooltip>
                <TooltipTrigger render={<Button size="icon-sm" aria-label="Reverse direction" />}><ArrowLeftRight aria-hidden="true" /></TooltipTrigger>
                <TooltipContent side="bottom">Reverse direction</TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger render={<Button size="icon-sm" tone="danger" aria-label="Delete edge" onClick={() => { setDeleted(true); setAnchor(null); }} />}><Trash2 aria-hidden="true" /></TooltipTrigger>
              <TooltipContent side="bottom">Delete edge</TooltipContent>
            </Tooltip>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Node label popup: anchored at the node, a 5-char input; Enter confirms, Escape cancels. */
export function NodeLabelDemo() {
  const [anchor, setAnchor] = useState<Point | null>(null);
  const [label, setLabel] = useState("A");
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col items-center gap-3">
      <svg width="120" height="90" viewBox="0 0 120 90" className="overflow-visible" aria-label="Demo node; click to rename">
        <g style={{ cursor: "pointer" }} onClick={(e) => setAnchor({ x: e.clientX, y: e.clientY - 24 })}>
          <circle cx="60" cy="45" r="24" fill="var(--node-start, var(--gradient-start-start))" stroke="var(--node-stroke, var(--color-node-stroke))" strokeWidth="1.5" />
          <text x="60" y="50" textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--color-text)">{label || "1"}</text>
        </g>
      </svg>
      <span className="gs-label">Click the node</span>
      <Popover open={anchor !== null} onOpenChange={(o) => !o && setAnchor(null)} modal>
        <PopoverContent side="top" sideOffset={12} anchor={anchor} className="p-2" aria-label="Rename node">
          <div className="flex items-center gap-2">
            <Label className="sr-only">Node label</Label>
            <Input
              ref={inputRef}
              aria-label="Node label"
              defaultValue={label}
              placeholder="1"
              maxLength={5}
              autoFocus
              className="w-20 text-center font-bold"
              onKeyDown={(e) => {
                if (e.key === "Enter") { setLabel(e.currentTarget.value); setAnchor(null); }
              }}
            />
            <Button size="sm" variant="primary" onClick={() => { setLabel(inputRef.current?.value ?? ""); setAnchor(null); }}>Save</Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
