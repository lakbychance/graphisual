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
import { CheckIcon } from "./check-icon";
import { POPUP_CLEARANCE } from "./popup-clearance";

export const Select = UISelect;
export { SelectValue, SelectValueIcon };

export function SelectTrigger({ className, ...props }: ComponentProps<typeof UISelectTrigger>) {
  return <UISelectTrigger className={cn("gs-button gs-select-trigger", className as string)} {...props} />;
}

export function SelectContent({ className, sideOffset = 8, ...props }: ComponentProps<typeof UISelectContent>) {
  return <UISelectContent sideOffset={Number(sideOffset) + POPUP_CLEARANCE} className={cn("gs-menu gs-panel gs-select", className as string)} {...props} />;
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
      {children ?? <CheckIcon />}
    </UISelectItemIndicator>
  );
}
