"use client";
import { useEffect, useEffectEvent } from "react";

/**
 * Runs `fn` once after mount when the main thread is idle, within `timeout` ms at the latest
 * (Safari has no requestIdleCallback: after 1.5 s). For warming chunks and mounting off-screen
 * UI without competing with the first paint or a tap.
 */
export function useOnIdle(fn: () => void, timeout = 3000) {
  const run = useEffectEvent(fn);
  useEffect(() => {
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(() => run(), { timeout });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(() => run(), 1500);
    return () => clearTimeout(t);
  }, [timeout]);
}
