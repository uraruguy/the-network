import { EASE, mix, progress } from "../../kit/motion";
import { PHONE_OUTER_H, PHONE_OUTER_W } from "../../devices/IPhone";

/** Phone pose on the 1080×1350 canvas: centre (x, y), scale, rotations (deg), opacity, dim. */
export type Pose = { x: number; y: number; s: number; rx: number; ry: number; rz: number; o: number; dim: number };

export const BASE: Pose = { x: 540, y: 935, s: 1.12, rx: 0, ry: 0, rz: 0, o: 1, dim: 0 };

type Key = [frame: number, pose: Partial<Pose>, ease?: (t: number) => number];

/** Screen offset of the 402×874 screen inside the 428×900 device. */
const BEZEL = (PHONE_OUTER_W - 402) / 2;

/** Pose that puts screen point (px, py) at canvas point (cx, cy) at scale s. */
export function focus(px: number, py: number, s: number, cx = 540, cy = 860): Pick<Pose, "x" | "y" | "s"> {
  return { x: cx - s * (px + BEZEL - PHONE_OUTER_W / 2), y: cy - s * (py + BEZEL - PHONE_OUTER_H / 2), s };
}

/** Canvas point of a screen point for a pose (no rotation), e.g. to anchor overlays to the UI. */
export function toCanvas(p: Pose, px: number, py: number) {
  return { x: p.x + p.s * (px + BEZEL - PHONE_OUTER_W / 2), y: p.y + p.s * (py + BEZEL - PHONE_OUTER_H / 2) };
}

/**
 * Keyframed camera: each key holds the pose reached at its frame; segments ease with the
 * *destination* key's easing (default: the long cinematic glide).
 */
export function track(keys: Key[]) {
  const full: [number, Pose, (t: number) => number][] = [];
  let prev = BASE;
  for (const [f, p, e] of keys) {
    prev = { ...prev, ...p };
    full.push([f, prev, e ?? EASE.glide]);
  }
  return (frame: number): Pose => {
    if (frame <= full[0]![0]) return full[0]![1];
    for (let i = 1; i < full.length; i++) {
      const [f1, p1, e] = full[i]!;
      const [f0, p0] = full[i - 1]!;
      if (frame <= f1) {
        const t = e((frame - f0) / (f1 - f0));
        return {
          x: mix(p0.x, p1.x, t),
          y: mix(p0.y, p1.y, t),
          s: mix(p0.s, p1.s, t),
          rx: mix(p0.rx, p1.rx, t),
          ry: mix(p0.ry, p1.ry, t),
          rz: mix(p0.rz, p1.rz, t),
          o: mix(p0.o, p1.o, t),
          dim: mix(p0.dim, p1.dim, t),
        };
      }
    }
    return full[full.length - 1]![1];
  };
}

/** Depth of field (canvas px) on the phone while the capture card floats in front of it. */
export const dof = (f: number) => 7 * progress(f, 340, 50, EASE.inOut) * (1 - progress(f, 588, 44, EASE.inOut));

/** Screen-space speed (px/frame) of the phone, for velocity-based blur. */
export function speed(cam: (f: number) => Pose, frame: number) {
  const a = cam(frame - 1);
  const b = cam(frame);
  const d = Math.hypot(b.x - a.x, b.y - a.y) + Math.abs(b.s - a.s) * 500 + (Math.abs(b.rx - a.rx) + Math.abs(b.ry - a.ry)) * 6;
  return d;
}

const PERSPECTIVE = 2200;

/**
 * Canvas point of a screen point for a pose, including the rotations and perspective that
 * PhoneRig applies (perspective → rotateX → rotateY → rotateZ → scale, about the device centre).
 */
export function project(p: Pose, px: number, py: number) {
  let x = (px + BEZEL - PHONE_OUTER_W / 2) * p.s;
  let y = (py + BEZEL - PHONE_OUTER_H / 2) * p.s;
  let z = 0;
  const rz = (p.rz * Math.PI) / 180;
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  const ry = (p.ry * Math.PI) / 180;
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  const rx = (p.rx * Math.PI) / 180;
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  const k = PERSPECTIVE / (PERSPECTIVE - z);
  return { x: p.x + x * k, y: p.y + y * k, k: k * p.s };
}
