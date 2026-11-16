import { Switch as UISwitch, SwitchThumb } from "@ui-sdk/react/switch";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Switch — a physical rocker: sunken track, raised thumb that slides. */
export function Switch({ className, ...props }: ComponentProps<typeof UISwitch>) {
  return (
    <UISwitch className={cn("gs-switch", className as string)} {...props}>
      <SwitchThumb className="gs-switch-thumb" />
    </UISwitch>
  );
}
