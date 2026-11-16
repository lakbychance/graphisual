import type { ComponentProps, ReactNode } from "react";
import { ToolbarButton, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";

interface IconActionProps extends Omit<ComponentProps<typeof ToolbarButton>, "children"> {
  /** Tooltip text; also the accessible name. */
  label: string;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}

/**
 * A toolbar icon button with a tooltip. The tooltip names the button (ui-sdk
 * uses the tooltip as the accessible name for icon-only triggers), and a
 * disabled button stays focusable so the tooltip can still say what it does.
 */
export function IconAction({ label, children, side = "bottom", ...props }: IconActionProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<ToolbarButton aria-label={label} {...props} />}>{children}</TooltipTrigger>
      <TooltipContent side={side}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function TemplateGlyph({ nodes, edges, className }: { nodes: [number, number][]; edges: [number, number][]; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.25" aria-hidden="true">
      {edges.map(([a, b]) => (
        <line key={`${a}-${b}`} x1={nodes[a][0]} y1={nodes[a][1]} x2={nodes[b][0]} y2={nodes[b][1]} />
      ))}
      {nodes.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2" fill="var(--color-surface)" />
      ))}
    </svg>
  );
}
