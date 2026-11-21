"use client";
import { useEffect, useEffectEvent } from "react";

/**
 * Calls `onMount` once, after the commit that mounted it. Placed next to a lazy sheet inside the
 * same Suspense boundary, it fires once the sheet's chunk has arrived and the sheet has mounted
 * closed: Base UI skips the enter transition of a Dialog/Drawer that mounts already open, so the
 * caller passes the real `open` only from then on.
 */
export function Mounted({ onMount }: { onMount: () => void }) {
  const run = useEffectEvent(onMount);
  useEffect(() => run(), []);
  return null;
}
