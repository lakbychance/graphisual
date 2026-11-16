import { Bolt, Check, Monitor, Ruler, Settings, StickyNote, Volume2, VolumeX, type LucideIcon } from "lucide-react";
import {
  Button, Menu, MenuCheckboxItem, MenuContent, MenuGroup, MenuGroupLabel, MenuItemIcon, MenuItemIndicator, MenuRadioGroup, MenuRadioItem, MenuSeparator, MenuTrigger, Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui-sdk";
import { THEME, type Theme } from "@/theme";
import { useSettingsStore } from "../../store/settingsStore";

interface ThemeSelectorProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  alignDropdown: "start" | "end";
}

const OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: THEME.LIGHT, label: "Paper", icon: StickyNote },
  { value: THEME.DARK, label: "Tungsten", icon: Bolt },
  { value: THEME.BLUEPRINT, label: "Blueprint", icon: Ruler },
  { value: THEME.SYSTEM, label: "System", icon: Monitor },
];

/** Settings menu: theme (a radio group, so the active theme is announced as checked) and sound. */
export const ThemeSelector = ({ theme, setTheme, alignDropdown }: ThemeSelectorProps) => {
  const soundEnabled = useSettingsStore((state) => state.soundEnabled);
  const setSoundEnabled = useSettingsStore((state) => state.setSoundEnabled);
  return (
    <Menu>
      <Tooltip>
        <TooltipTrigger render={<Button render={<MenuTrigger />} variant="ghost" size="icon-sm" aria-label="Settings" />}>
          <Settings size={18} className="text-(--color-text-muted)" />
        </TooltipTrigger>
        <TooltipContent side="top">Settings</TooltipContent>
      </Tooltip>
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
        <MenuSeparator />
        <MenuCheckboxItem value="sound" checked={soundEnabled} onCheckedChange={setSoundEnabled}>
          <MenuItemIcon>{soundEnabled ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}</MenuItemIcon>
          Sound
          <MenuItemIndicator><Check className="h-3.5 w-3.5" aria-hidden="true" /></MenuItemIndicator>
        </MenuCheckboxItem>
      </MenuContent>
    </Menu>
  );
};
