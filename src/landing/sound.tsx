import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
import { playPressSound, primePressSound, setPressSoundEnabled, type SoundEvent } from "@/components/ui-sdk/press-sound";
import type { MaterialName } from "./LiveGraph";

/** The app's sound kit for each of the page's materials. */
const KIT: Record<MaterialName, string> = { paper: "paper", graphite: "tungsten", blueprint: "blueprint" };

interface Sound {
  on: boolean;
  toggle: () => void;
  /** Voice one event in a material's kit. Silent while sound is off. */
  play: (material: MaterialName, event: SoundEvent, strength?: number) => void;
}

const SoundContext = createContext<Sound>({ on: false, toggle: () => {}, play: () => {} });
export const useSound = () => useContext(SoundContext);

/**
 * Opt-in sound for a whole page, using the app's own kits. The kit a sound is voiced
 * in is read from a CSS variable on its scope element, so each material gets a hidden
 * scope that names its kit.
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [on, setOn] = useState(false);
  const live = useRef(false);
  const scopes = useRef<Record<MaterialName, HTMLSpanElement | null>>({ paper: null, graphite: null, blueprint: null });

  const play = useCallback<Sound["play"]>((material, event, strength) => {
    const scope = scopes.current[material];
    if (live.current && scope) playPressSound(scope, event, strength);
  }, []);
  const toggle = useCallback(() => {
    live.current = !live.current;
    setPressSoundEnabled(live.current);
    if (live.current) primePressSound();
    setOn(live.current);
  }, []);
  const value = useMemo(() => ({ on, toggle, play }), [on, toggle, play]);

  return (
    <SoundContext.Provider value={value}>
      {children}
      {(Object.keys(KIT) as MaterialName[]).map((material) => (
        <span key={material} hidden data-skin={`lp-${material}`} ref={(el) => { scopes.current[material] = el; }} style={{ "--sound-kit": KIT[material] } as React.CSSProperties} />
      ))}
    </SoundContext.Provider>
  );
}
