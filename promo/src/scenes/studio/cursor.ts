import { EASE, clamp01 } from "../../kit/motion";

export type Pt = { x: number; y: number };
/** A cursor waypoint: where to be (resolved every frame, so it can track moving UI) from frame `f`. */
export type Waypoint = { f: number; at: (frame: number) => Pt; travel?: number };

/**
 * Cursor position along waypoints. Between two waypoints the pointer glides over `travel`
 * frames (default 26) ending at the next waypoint's frame, on a gentle arc, like a hand on a
 * trackpad. Targets are re-evaluated each frame, so the pointer stays locked on UI under a
 * moving camera.
 */
export function cursorAt(points: Waypoint[], frame: number): Pt {
  if (frame <= points[0]!.f) return points[0]!.at(frame);
  for (let i = 1; i < points.length; i++) {
    const b = points[i]!;
    if (frame <= b.f) {
      const a = points[i - 1]!;
      const travel = b.travel ?? 26;
      const start = Math.max(a.f, b.f - travel);
      const pa = a.at(frame);
      const pb = b.at(frame);
      if (frame <= start) return pa;
      const t = EASE.inOut(clamp01((frame - start) / (b.f - start)));
      const dx = pb.x - pa.x;
      const dy = pb.y - pa.y;
      const bow = Math.sin(Math.PI * t) * 0.1;
      return { x: pa.x + dx * t - dy * bow, y: pa.y + dy * t + dx * bow };
    }
  }
  return points[points.length - 1]!.at(frame);
}

/** Press (0..1) and ripple progress around click frames. */
export function clickState(clicks: number[], frame: number) {
  let press = 0;
  let ripple: number | null = null;
  for (const c of clicks) {
    const d = frame - c;
    if (d >= -5 && d <= 7) press = Math.max(press, d < 0 ? (d + 5) / 5 : 1 - d / 7);
    if (d >= 0 && d <= 22) ripple = d / 22;
  }
  return { press: clamp01(press), ripple };
}
