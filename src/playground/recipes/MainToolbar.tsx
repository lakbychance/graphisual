import { useState } from "react";
import { Box, Download, Feather, FileCode, Image, Minus, Plus, RotateCcw, Zap } from "lucide-react";
import {
  Menu, MenuContent, MenuItem, MenuItemIcon, MenuTrigger, SegmentedControl, SegmentedControlItem, Select, SelectContent,
  SelectItem, SelectItemIcon, SelectItemIndicator, SelectTrigger, SelectValueIcon, Toolbar, ToolbarButton, ToolbarGroup,
  ToolbarSeparator, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { AlgorithmPicker } from "./AlgorithmPicker";
import { GraphGenerator } from "./GraphGenerator";
import { IconAction } from "./IconAction";
import { SPEEDS } from "./mock";

type RenderMode = "svg" | "canvas" | "3d";
const MODES: { value: RenderMode; label: string; hint: string; icon: typeof Feather }[] = [
  { value: "svg", label: "Standard", hint: "Smooth animations", icon: Feather },
  { value: "canvas", label: "Performance", hint: "For large graphs", icon: Zap },
  { value: "3d", label: "3D", hint: "View only", icon: Box },
];

export interface MainToolbarProps {
  mode?: "auto" | "manual";
  onModeChange?: (mode: "auto" | "manual") => void;
  running?: boolean;
  compact?: boolean;
}

/**
 * The main toolbar. One tab stop; arrow keys walk every control including the
 * segmented mode switch, the popover/menu/select triggers (via `render`) and
 * the speed stepper.
 */
export function MainToolbar({ mode: modeProp, onModeChange, running = false, compact = false }: MainToolbarProps) {
  const [modeState, setModeState] = useState<"auto" | "manual">("auto");
  const mode = modeProp ?? modeState;
  const setMode = (m: "auto" | "manual") => { setModeState(m); onModeChange?.(m); };
  const [algorithm, setAlgorithm] = useState<string | null>("bfs");
  const [speed, setSpeed] = useState(1);
  const [render, setRender] = useState<RenderMode>("svg");
  const [exportMsg, setExportMsg] = useState<string | null>(null);

  return (
    <Toolbar aria-label="Graph controls">
      <SegmentedControl aria-label="Visualization mode" value={mode} onValueChange={(v) => v && setMode(v as "auto" | "manual")} disabled={running}>
        <Tooltip>
          <TooltipTrigger render={<SegmentedControlItem value="auto" />}>Auto</TooltipTrigger>
          <TooltipContent>Runs visualization automatically</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<SegmentedControlItem value="manual" />}>Step</TooltipTrigger>
          <TooltipContent>Control each step manually</TooltipContent>
        </Tooltip>
      </SegmentedControl>
      <ToolbarSeparator />

      <AlgorithmPicker value={algorithm} onChange={setAlgorithm} disabled={running} />
      <ToolbarSeparator />
      <GraphGenerator disabled={running} />

      {!compact && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup aria-label="Speed" className="gap-1">
            <IconAction label="Slower" size="icon-xs" disabled={running || speed === 0} onClick={() => setSpeed((s) => Math.max(0, s - 1))}>
              <Minus aria-hidden="true" />
            </IconAction>
            <Tooltip>
              <TooltipTrigger render={<span className="gs-value text-xs min-w-8 text-center cursor-help" />}>{SPEEDS[speed]}</TooltipTrigger>
              <TooltipContent>Visualization speed</TooltipContent>
            </Tooltip>
            <IconAction label="Faster" size="icon-xs" disabled={running || speed === SPEEDS.length - 1} onClick={() => setSpeed((s) => Math.min(SPEEDS.length - 1, s + 1))}>
              <Plus aria-hidden="true" />
            </IconAction>
          </ToolbarGroup>
        </>
      )}

      <ToolbarSeparator />
      <ToolbarGroup aria-label="View and export" className="gap-1 md:gap-2">
        <Select value={render} onValueChange={(v) => v && setRender(v as RenderMode)} disabled={running}>
          <Tooltip>
            <TooltipTrigger render={<ToolbarButton render={<SelectTrigger />} aria-label="View mode" />}>
              <SelectValueIcon />
            </TooltipTrigger>
            <TooltipContent>View mode</TooltipContent>
          </Tooltip>
          <SelectContent align="center" sideOffset={10}>
            {MODES.map((m) => (
              <SelectItem key={m.value} value={m.value} label={m.label}>
                <SelectItemIcon><m.icon aria-hidden="true" /></SelectItemIcon>
                <span className="flex flex-col">
                  <span>{m.label}</span>
                  <span className="gs-description">{m.hint}</span>
                </span>
                <SelectItemIndicator />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Menu onAction={(value) => { setExportMsg(value); setTimeout(() => setExportMsg(null), 1200); }}>
          <Tooltip>
            <TooltipTrigger render={<ToolbarButton render={<MenuTrigger />} aria-label="Export" disabled={running} />}>
              <Download aria-hidden="true" />
            </TooltipTrigger>
            <TooltipContent>{exportMsg ? `Exported ${exportMsg.toUpperCase()}` : "Export"}</TooltipContent>
          </Tooltip>
          <MenuContent align="center" sideOffset={10}>
            {render === "svg" && (
              <MenuItem value="svg" shortcut="mod+shift+s">
                <MenuItemIcon><FileCode aria-hidden="true" /></MenuItemIcon>
                Export as SVG
              </MenuItem>
            )}
            <MenuItem value="png" shortcut="mod+shift+p">
              <MenuItemIcon><Image aria-hidden="true" /></MenuItemIcon>
              Export as PNG
            </MenuItem>
          </MenuContent>
        </Menu>

        <IconAction label="Reset graph" tone="danger" disabled={running}>
          <RotateCcw aria-hidden="true" />
        </IconAction>
      </ToolbarGroup>
    </Toolbar>
  );
}
