/**
 * How the globe survives losing its graphics (WebGL) context: the browser takes it back under
 * memory pressure, after sleep, when Safari's GPU process restarts, or (in MapLibre's terms) when
 * iOS ends the map's workers in the background. MapLibre restores most of these by itself. When the
 * context doesn't come back, the map is rebuilt in place, where it was, a few times before the
 * fallback card is shown.
 */

/** How long a visible page waits for the browser to hand the context back before rebuilding. */
export const RESTORE_WAIT_MS = 2000;
/** Automatic rebuilds allowed within REBUILD_WINDOW_MS; one more failure shows the fallback. */
export const MAX_REBUILDS = 3;
export const REBUILD_WINDOW_MS = 2 * 60_000;
/** Delay before the 1st, 2nd and 3rd rebuild in a window: give a struggling GPU some room. */
const REBUILD_DELAYS_MS = [0, 1500, 4000] as const;

export type RebuildPlan = { ok: true; delay: number; history: number[] } | { ok: false; history: number[] };

/** Records a rebuild at `now` (and how long to wait first), unless the budget is spent. */
export function planRebuild(history: readonly number[], now: number): RebuildPlan {
  const recent = history.filter((t) => now - t < REBUILD_WINDOW_MS);
  if (recent.length >= MAX_REBUILDS) return { ok: false, history: recent };
  return { ok: true, delay: REBUILD_DELAYS_MS[recent.length] ?? REBUILD_DELAYS_MS.at(-1)!, history: [...recent, now] };
}
