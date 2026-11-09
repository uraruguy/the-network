import { Easing, interpolate, spring, type SpringConfig } from "remotion";

/** The app's own easing tokens (globals.css), so UI motion in the video feels like the app. */
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1),
  ios: Easing.bezier(0.32, 0.72, 0, 1),
  inOut: Easing.bezier(0.65, 0, 0.35, 1),
  in: Easing.bezier(0.4, 0, 1, 1),
  /** Cinematic camera move: slow start, long glide. */
  glide: Easing.bezier(0.45, 0, 0.1, 1),
} as const;

export const FPS = 60;
export const sec = (s: number) => Math.round(s * FPS);

/** 0→1 over [start, start+dur] frames with an easing; clamped. */
export function progress(frame: number, start: number, dur: number, ease: (t: number) => number = EASE.out) {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

/** Linear map with clamping and optional easing: tween(frame, [a,b], [from,to]). */
export function tween(
  frame: number,
  input: readonly [number, number],
  output: readonly [number, number],
  ease: (t: number) => number = EASE.out,
) {
  return interpolate(frame, input as [number, number], output as [number, number], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });
}

export const SPRINGS = {
  snappy: { damping: 26, stiffness: 320, mass: 1 },
  smooth: { damping: 30, stiffness: 170, mass: 1 },
  pop: { damping: 13, stiffness: 210, mass: 0.9 },
  sheet: { damping: 32, stiffness: 140, mass: 1.1 },
  soft: { damping: 40, stiffness: 90, mass: 1.2 },
} satisfies Record<string, Partial<SpringConfig>>;

/** Spring 0→1 starting at `delay` frames. */
export function springAt(frame: number, delay: number, config: Partial<SpringConfig> = SPRINGS.smooth, fps = FPS) {
  return spring({ frame: frame - delay, fps, config });
}

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Deterministic PRNG (mulberry32) so every render is identical. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** How many characters of `text` are visible when typing at `cps` chars/second from `start`. */
export function typed(text: string, frame: number, start: number, cps = 22, fps = FPS) {
  const n = Math.floor(((frame - start) / fps) * cps);
  return text.slice(0, Math.max(0, Math.min(text.length, n)));
}
