import { Keyboard } from "lucide-react";
import { Button, Kbd, Label, Popover, PopoverContent, PopoverTitle, PopoverTrigger, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui-sdk";

const isMac = typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? "⌘" : "Ctrl";

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string[]; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: [modKey, "Z"], description: "Undo" },
      { keys: [modKey, "⇧", "Z"], description: "Redo" },
      { keys: [modKey, "+ / −"], description: "Zoom in / out" },
      { keys: ["⇧", "Drag"], description: "Select multiple nodes" },
    ],
  },
  {
    title: "When node selected",
    shortcuts: [
      { keys: ["↑ ↓ ← →"], description: "Navigate to nearby node" },
      { keys: ["E"], description: "Cycle through edges" },
      { keys: ["Enter"], description: "Edit label / focused edge" },
      { keys: ["Delete"], description: "Delete node" },
    ],
  },
  {
    title: "Step mode",
    shortcuts: [
      { keys: ["← →"], description: "Previous / next step" },
      { keys: ["Space"], description: "Play / pause" },
      { keys: ["Home", "End"], description: "Jump to start / end" },
    ],
  },
];

export const KeyboardShortcuts = () => {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger render={<Button render={<PopoverTrigger />} size="icon" aria-label="Keyboard shortcuts" />}>
          <Keyboard size={20} className="text-(--color-text-muted)" />
        </TooltipTrigger>
        <TooltipContent side="top">Keyboard shortcuts</TooltipContent>
      </Tooltip>
      <PopoverContent side="top" align="end" sideOffset={8} className="w-64">
        <PopoverTitle>Keyboard shortcuts</PopoverTitle>
        <div className="flex flex-col gap-3">
          {shortcutGroups.map((group) => (
            <div key={group.title} className="flex flex-col gap-1.5">
              <Label>{group.title}</Label>
              {group.shortcuts.map((shortcut) => (
                <div key={shortcut.description} className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-(--color-text-muted)">{shortcut.description}</span>
                  <span className="flex gap-1">
                    {shortcut.keys.map((key) => <Kbd key={key}>{key}</Kbd>)}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
