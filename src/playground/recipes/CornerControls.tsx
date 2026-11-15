import { useState } from "react";
import { Check, Keyboard, Monitor, Moon, Redo2, Ruler, Sun, SunMoon, Undo2, Waypoints, ZoomIn, ZoomOut } from "lucide-react";
import {
  Button, Kbd, Menu, MenuContent, MenuGroup, MenuGroupLabel, MenuItemIcon, MenuItemIndicator, MenuRadioGroup, MenuRadioItem,
  MenuTrigger, Popover, PopoverContent, PopoverTitle, PopoverTrigger, Toolbar, ToolbarButton, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { IconAction } from "./IconAction";
import { SHORTCUT_GROUPS } from "./mock";

/** Zoom controls: out / percentage (reset) / in, in one toolbar panel. */
export function ZoomControls() {
  const [zoom, setZoom] = useState(1);
  return (
    <Toolbar aria-label="Zoom controls">
      <IconAction label="Zoom out" side="top" disabled={zoom <= 0.5} onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}><ZoomOut aria-hidden="true" /></IconAction>
      <Tooltip>
        <TooltipTrigger render={<ToolbarButton size="icon-xs" className="min-w-10 gs-value" aria-label="Reset zoom" onClick={() => setZoom(1)} />}>
          {Math.round(zoom * 100)}%
        </TooltipTrigger>
        <TooltipContent side="top">Reset zoom</TooltipContent>
      </Tooltip>
      <IconAction label="Zoom in" side="top" disabled={zoom >= 2} onClick={() => setZoom((z) => Math.min(2, z + 0.25))}><ZoomIn aria-hidden="true" /></IconAction>
    </Toolbar>
  );
}

/** Undo / redo panel. Both stay focusable while disabled so their tooltips still explain them. */
export function HistoryControls() {
  const [depth, setDepth] = useState(2);
  return (
    <Toolbar aria-label="History controls">
      <IconAction label="Undo" side="top" disabled={depth === 0} onClick={() => setDepth((d) => d - 1)}><Undo2 aria-hidden="true" /></IconAction>
      <IconAction label="Redo" side="top" disabled={depth === 3} onClick={() => setDepth((d) => d + 1)}><Redo2 aria-hidden="true" /></IconAction>
    </Toolbar>
  );
}

type ThemeChoice = "light" | "dark" | "blueprint" | "system";
const THEMES: { value: ThemeChoice; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "blueprint", label: "Blueprint", icon: Ruler },
  { value: "system", label: "System", icon: Monitor },
];

/** Theme selector: a radio-group menu, so the chosen theme is announced as checked. */
export function ThemeMenu({ align = "end" }: { align?: "start" | "end" }) {
  const [theme, setTheme] = useState<ThemeChoice>("system");
  return (
    <Menu>
      <Tooltip>
        <TooltipTrigger render={<Button render={<MenuTrigger />} size="icon" aria-label="Theme settings" />}>
          <SunMoon className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="top">Theme</TooltipContent>
      </Tooltip>
      <MenuContent side="top" align={align} sideOffset={10} className="w-44">
        <MenuGroup>
          <MenuGroupLabel>Theme</MenuGroupLabel>
          <MenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as ThemeChoice)}>
            {THEMES.map((t) => (
              <MenuRadioItem key={t.value} value={t.value}>
                <MenuItemIcon><t.icon aria-hidden="true" /></MenuItemIcon>
                {t.label}
                <MenuItemIndicator><Check className="h-3.5 w-3.5" aria-hidden="true" /></MenuItemIndicator>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
}

/** Keyboard shortcuts popover. */
export function ShortcutsPopover() {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<Button render={<PopoverTrigger />} size="icon" aria-label="Keyboard shortcuts" />}>
          <Keyboard className="h-5 w-5" aria-hidden="true" />
        </TooltipTrigger>
        <TooltipContent side="top">Keyboard shortcuts</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="end" sideOffset={10} className="w-64">
        <PopoverTitle>Keyboard shortcuts</PopoverTitle>
        <div className="flex flex-col gap-3">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title} className="flex flex-col gap-1.5">
              <span className="gs-label">{group.title}</span>
              {group.shortcuts.map((s) => (
                <div key={s.description} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-(--color-text-muted)">{s.description}</span>
                  <span className="flex gap-1">
                    {s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Collapsed trace toggle. */
export function TraceToggle({ onExpand }: { onExpand?: () => void }) {
  return (
    <Tooltip>
      <TooltipTrigger render={<Button size="icon" aria-label="Show algorithm trace" onClick={onExpand} />}>
        <Waypoints className="h-5 w-5" aria-hidden="true" />
      </TooltipTrigger>
      <TooltipContent side="top">Show trace</TooltipContent>
    </Tooltip>
  );
}
