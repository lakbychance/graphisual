import { useWebHaptics } from "web-haptics/react";
import { useMemo } from "react";

export function useAppHaptics() {
  const haptics = useWebHaptics();

  return useMemo(() => ({
    destroy: () => haptics.cancel(),
    light: () => haptics.trigger("light"),
    medium: () => haptics.trigger("medium"),
    selection: () => haptics.trigger("selection"),
    success: () => haptics.trigger("success"),
    warning: () => haptics.trigger("warning"),
    error: () => haptics.trigger("error"),
  }), [haptics]);
}
