import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export interface Playback {
  index: number;
  playing: boolean;
  last: number;
  setIndex: (index: number) => void;
  toggle: () => void;
  step: (delta: number) => void;
  restart: () => void;
}

/** A clock over a run's frames. Rewinds and replays on its own when `loop` is set. */
export function usePlayback(length: number, { ms = 700, loop = true, autoplay = true, hold = 2200 } = {}): Playback {
  const last = Math.max(0, length - 1);
  const [index, setIndexState] = useState(0);
  const [playing, setPlaying] = useState(autoplay);
  const indexRef = useRef(0);
  indexRef.current = index;

  const setIndex = useCallback((next: number) => setIndexState(Math.max(0, Math.min(last, next))), [last]);

  useEffect(() => { if (index > last) setIndexState(last); }, [index, last]);

  useEffect(() => {
    if (!playing) return;
    const atEnd = index >= last;
    if (atEnd && !loop) { setPlaying(false); return; }
    const timer = window.setTimeout(() => setIndexState(atEnd ? 0 : indexRef.current + 1), atEnd ? hold : ms);
    return () => window.clearTimeout(timer);
  }, [playing, index, last, loop, ms, hold]);

  return useMemo(() => ({
    index: Math.min(index, last), playing, last, setIndex,
    toggle: () => setPlaying((p) => { if (!p && indexRef.current >= last) setIndexState(0); return !p; }),
    step: (delta: number) => { setPlaying(false); setIndex(indexRef.current + delta); },
    restart: () => { setIndexState(0); setPlaying(true); },
  }), [index, last, playing, setIndex]);
}
