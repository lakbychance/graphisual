import { Check, Monitor, Moon, Ruler, Sun } from "lucide-react";
import { SunMoonIcon as ThemeIcon } from "../ui/icons/SunMoonIcon";
import {
  Button, Menu, MenuContent, MenuGroup, MenuGroupLabel, MenuItemIcon, MenuItemIndicator, MenuRadioGroup, MenuRadioItem, MenuTrigger,
} from "@/components/ui-sdk";
import { THEME, type Theme } from "@/theme";

interface ThemeSelectorProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  alignDropdown: "start" | "end";
}

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: THEME.LIGHT, label: "Light", icon: Sun },
  { value: THEME.DARK, label: "Dark", icon: Moon },
  { value: THEME.BLUEPRINT, label: "Blueprint", icon: Ruler },
  { value: THEME.SYSTEM, label: "System", icon: Monitor },
];

/** Theme menu: a radio group, so the active theme is announced as checked. */
export const ThemeSelector = ({ theme, setTheme, alignDropdown }: ThemeSelectorProps) => {
  return (
    <Menu>
      <Button render={<MenuTrigger />} size="icon" aria-label="Theme settings">
        <ThemeIcon size={24} className="text-(--color-text-muted)" />
      </Button>
      <MenuContent align={alignDropdown} sideOffset={8} className="w-44">
        <MenuGroup>
          <MenuGroupLabel>Theme</MenuGroupLabel>
          <MenuRadioGroup value={theme} onValueChange={(value) => setTheme(value as Theme)}>
            {OPTIONS.map((option) => (
              <MenuRadioItem key={option.value} value={option.value} closeOnSelect>
                <MenuItemIcon><option.icon aria-hidden="true" /></MenuItemIcon>
                {option.label}
                <MenuItemIndicator><Check className="h-3.5 w-3.5" aria-hidden="true" /></MenuItemIndicator>
              </MenuRadioItem>
            ))}
          </MenuRadioGroup>
        </MenuGroup>
      </MenuContent>
    </Menu>
  );
};
