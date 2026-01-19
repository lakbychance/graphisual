import { Sun, Moon, Monitor, Check } from "lucide-react";
import { SunMoonIcon as ThemeIcon } from '../ui/icons/SunMoonIcon';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { GrainTexture } from "../ui/grain-texture";
import { THEME, type Theme } from "../../constants";

interface ThemeSelectorProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  alignDropdown: "start" | "end";
}

export const ThemeSelector = ({ theme, setTheme, alignDropdown }: ThemeSelectorProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Theme settings"
          className="relative h-10 w-10 flex items-center justify-center rounded-md bg-[var(--color-surface)] shadow-[var(--shadow-raised),var(--highlight-edge)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent-form)]/50"
        >
          <GrainTexture baseFrequency={4.2} className="rounded-md overflow-hidden" />
          <ThemeIcon size={24} className="text-[var(--color-text-muted)]" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={alignDropdown} sideOffset={8} className="w-40 font-['Outfit']">
        <DropdownMenuLabel className="text-xs font-medium">Theme</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme(THEME.LIGHT)}
          className="cursor-pointer gap-2"
        >
          <Sun className="h-4 w-4" />
          <span className="flex-1">Light</span>
          {theme === THEME.LIGHT && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme(THEME.DARK)}
          className="cursor-pointer gap-2"
        >
          <Moon className="h-4 w-4" />
          <span className="flex-1">Dark</span>
          {theme === THEME.DARK && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme(THEME.SYSTEM)}
          className="cursor-pointer gap-2"
        >
          <Monitor className="h-4 w-4" />
          <span className="flex-1">System</span>
          {theme === THEME.SYSTEM && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
