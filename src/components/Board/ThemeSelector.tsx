import { Sun, Moon, Monitor, Ruler, Check } from "lucide-react";
import { SunMoonIcon as ThemeIcon } from '../ui/icons/SunMoonIcon';
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { GrainTexture } from "../ui/grain-texture";
import { THEME, type Theme } from "../../constants/theme";

interface ThemeSelectorProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  alignDropdown: "start" | "end";
}

export const ThemeSelector = ({ theme, setTheme, alignDropdown }: ThemeSelectorProps) => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          aria-label="Theme settings"
          className="relative"
        >
          <GrainTexture baseFrequency={4.2} className="rounded-lg overflow-hidden" />
          <ThemeIcon size={24} className="text-[var(--color-text-muted)]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={alignDropdown} sideOffset={8} className="w-40">
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
          onClick={() => setTheme(THEME.BLUEPRINT)}
          className="cursor-pointer gap-2"
        >
          <Ruler className="h-4 w-4" />
          <span className="flex-1">Blueprint</span>
          {theme === THEME.BLUEPRINT && <Check className="h-4 w-4 text-[var(--color-accent)]" />}
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
