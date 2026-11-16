import {
  Tabs as UITabs,
  TabsIndicator as UITabsIndicator,
  TabsList as UITabsList,
  TabsPanel as UITabsPanel,
  TabsTab as UITabsTab,
} from "@ui-sdk/react/tabs";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Tabs({ className, ...props }: ComponentProps<typeof UITabs>) {
  return <UITabs className={cn("gs-tabs", className as string)} {...props} />;
}

/** TabsList — sunken rail; the indicator is the raised cap that slides to the selected tab. */
type TabsListProps = Omit<ComponentProps<typeof UITabsList>, "children"> & { children?: ReactNode };

export function TabsList({ className, children, ...props }: TabsListProps) {
  return (
    <UITabsList className={cn("gs-tabs-list", className as string)} {...props}>
      <UITabsIndicator className="gs-tabs-indicator" />
      {children}
    </UITabsList>
  );
}

export function TabsTab({ className, ...props }: ComponentProps<typeof UITabsTab>) {
  return <UITabsTab className={cn("gs-tab", className as string)} {...props} />;
}

export function TabsPanel({ className, ...props }: ComponentProps<typeof UITabsPanel>) {
  return <UITabsPanel className={cn("gs-tabs-panel", className as string)} {...props} />;
}
