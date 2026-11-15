import {
  Select as UISelect,
  SelectContent as UISelectContent,
  SelectItem as UISelectItem,
  SelectItemIcon as UISelectItemIcon,
  SelectItemIndicator as UISelectItemIndicator,
  SelectTrigger as UISelectTrigger,
  SelectValue,
  SelectValueIcon,
} from "@ui-sdk/react/select";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export const Select = UISelect;
export { SelectValue, SelectValueIcon };

export function SelectTrigger({ className, ...props }: ComponentProps<typeof UISelectTrigger>) {
  return <UISelectTrigger className={cn("gs-button gs-select-trigger", className as string)} {...props} />;
}

export function SelectContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof UISelectContent>) {
  return <UISelectContent sideOffset={sideOffset} className={cn("gs-menu gs-panel gs-select", className as string)} {...props} />;
}

export function SelectItem({ className, ...props }: ComponentProps<typeof UISelectItem>) {
  return <UISelectItem className={cn("gs-menu-item gs-select-item", className as string)} {...props} />;
}

export function SelectItemIcon({ className, ...props }: ComponentProps<typeof UISelectItemIcon>) {
  return <UISelectItemIcon className={cn("gs-menu-icon", className as string)} {...props} />;
}

export function SelectItemIndicator({ className, children, ...props }: ComponentProps<typeof UISelectItemIndicator>) {
  return (
    <UISelectItemIndicator className={cn("gs-menu-indicator", className as string)} {...props}>
      {children ?? (
        <svg viewBox="0 0 12 12" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M2.5 6.5 5 9l4.5-6" />
        </svg>
      )}
    </UISelectItemIndicator>
  );
}
