import {
  Menu as UIMenu,
  MenuContent as UIMenuContent,
  MenuGroup,
  MenuGroupLabel as UIMenuGroupLabel,
  MenuItem as UIMenuItem,
  MenuItemIcon as UIMenuItemIcon,
  MenuItemIndicator as UIMenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem as UIMenuRadioItem,
  MenuSeparator as UIMenuSeparator,
  MenuShortcut as UIMenuShortcut,
  MenuTrigger,
} from "@ui-sdk/react/menu";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Menu = UIMenu;
export { MenuTrigger, MenuGroup, MenuRadioGroup };

export function MenuContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof UIMenuContent>) {
  return <UIMenuContent sideOffset={sideOffset} className={cn("gs-menu gs-panel", className as string)} {...props} />;
}

export function MenuItem({ className, ...props }: ComponentProps<typeof UIMenuItem>) {
  return <UIMenuItem className={cn("gs-menu-item", className as string)} {...props} />;
}

export function MenuRadioItem({ className, ...props }: ComponentProps<typeof UIMenuRadioItem>) {
  return <UIMenuRadioItem className={cn("gs-menu-item", className as string)} {...props} />;
}

export function MenuItemIcon({ className, ...props }: ComponentProps<typeof UIMenuItemIcon>) {
  return <UIMenuItemIcon className={cn("gs-menu-icon", className as string)} {...props} />;
}

/** Check mark (or LED pip in some skins) for the chosen radio item. */
export function MenuItemIndicator({ className, children, ...props }: ComponentProps<typeof UIMenuItemIndicator>) {
  return (
    <UIMenuItemIndicator className={cn("gs-menu-indicator", className as string)} {...props}>
      {children ?? (
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6.5 5 9l4.5-6" />
        </svg>
      )}
    </UIMenuItemIndicator>
  );
}

export function MenuGroupLabel({ className, ...props }: ComponentProps<typeof UIMenuGroupLabel>) {
  return <UIMenuGroupLabel className={cn("gs-menu-label", className as string)} {...props} />;
}

export function MenuSeparator({ className, ...props }: ComponentProps<typeof UIMenuSeparator>) {
  return <UIMenuSeparator className={cn("gs-menu-separator", className as string)} {...props} />;
}

export function MenuShortcut({ className, ...props }: ComponentProps<typeof UIMenuShortcut>) {
  return <UIMenuShortcut className={cn("gs-kbd gs-menu-shortcut", className as string)} {...props} />;
}
