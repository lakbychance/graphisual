import { Keyboard } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { GrainTexture } from "../ui/grain-texture";

const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? '⌘' : 'Ctrl';

// Render key string with properly sized ⌘ symbol
const renderKeys = (keys: string) => {
  if (!keys.includes('⌘')) return keys;

  const parts = keys.split('⌘');
  return (
    <span className="grid grid-flow-col items-center">
      {parts.map((part, i) => (
        <span key={i} className="contents">
          {i > 0 && <span>⌘</span>}
          <span>{part}</span>
        </span>
      ))}
    </span>
  );
};

interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; description: string }[];
}

const shortcutGroups: ShortcutGroup[] = [
  {
    title: "General",
    shortcuts: [
      { keys: `${modKey}+Z`, description: "Undo" },
      { keys: `${modKey}+⇧+Z`, description: "Redo" },
      { keys: `${modKey}+/−`, description: "Zoom in / out" },
      { keys: "⇧+Drag", description: "Select multiple nodes" },
    ],
  },
  {
    title: "When Node Selected",
    shortcuts: [
      { keys: "↑ ↓ ← →", description: "Navigate to nearby node" },
      { keys: "E", description: "Cycle through edges" },
      { keys: "Enter", description: "Edit focused edge" },
      { keys: "Delete", description: "Delete node" },
    ],
  },
  {
    title: "Step Mode",
    shortcuts: [
      { keys: "← →", description: "Previous / next step" },
      { keys: "Space", description: "Play / pause" },
      { keys: "Home / End", description: "Jump to start / end" },
    ],
  },
];

export const KeyboardShortcuts = () => {
  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              aria-label="Keyboard shortcuts"
              className="relative h-10 w-10 flex items-center justify-center rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)] focus-ring-animated"
            >
              <GrainTexture baseFrequency={4.2} className="rounded-md overflow-hidden" />
              <Keyboard size={20} className="text-[var(--color-text-muted)]" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>Keyboard shortcuts</TooltipContent>
      </Tooltip>
      <PopoverContent
        side="top"
        align="end"
        sideOffset={8}
        className="w-64 p-0"
      >
        <GrainTexture baseFrequency={4.2} className="rounded-lg" />
        <div className="relative p-3">
          <h3 className="font-semibold text-sm text-[var(--color-text)] mb-3">
            Keyboard Shortcuts
          </h3>
          <div className="space-y-3">
            {shortcutGroups.map((group) => (
              <div key={group.title}>
                <h4 className="text-xs font-semibold text-[var(--color-text)] mb-1.5">
                  {group.title}
                </h4>
                <div className="space-y-1.5">
                  {group.shortcuts.map((shortcut) => (
                    <div
                      key={shortcut.description}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-[var(--color-text-muted)]">
                        {shortcut.description}
                      </span>
                      <kbd className="px-1.5 py-0.5 flex font-sans items-center rounded bg-[var(--color-paper)] text-[var(--color-text)] text-[10px]">
                        {renderKeys(shortcut.keys)}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
