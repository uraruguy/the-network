import { EASE, mix } from "../../kit/motion";

/**
 * A camera over a flat object (the Mac window) in 3D: the object point (fx, fy) lands on the
 * screen point (sx, sy), scaled by `zoom` and tilted by rx/ry/rz around that point. Keyframes
 * interpolate every field independently, which reads as a dolly + pan + tilt.
 */
export type Cam = { fx: number; fy: number; zoom: number; sx: number; sy: number; rx: number; ry: number; rz: number };
export type Key = { f: number; cam: Partial<Cam>; ease?: (t: number) => number };

export const PERSPECTIVE = 2600;
export const ORIGIN: [number, number] = [960, 540];

const BASE: Cam = { fx: 720, fy: 469, zoom: 0.8, sx: 960, sy: 640, rx: 0, ry: 0, rz: 0 };

/** Resolves partial keys (each inherits the previous key's values) and samples at `frame`. */
export function camAt(keys: Key[], frame: number): Cam {
  const full: { f: number; cam: Cam; ease: (t: number) => number }[] = [];
  let prev = BASE;
  for (const k of keys) {
    const cam = { ...prev, ...k.cam };
    full.push({ f: k.f, cam, ease: k.ease ?? EASE.glide });
    prev = cam;
  }
  if (frame <= full[0]!.f) return full[0]!.cam;
  for (let i = 1; i < full.length; i++) {
    const a = full[i - 1]!;
    const b = full[i]!;
    if (frame <= b.f) {
      const t = b.ease((frame - a.f) / (b.f - a.f));
      const out = {} as Cam;
      for (const key of Object.keys(a.cam) as (keyof Cam)[]) out[key] = mix(a.cam[key], b.cam[key], t);
      return out;
    }
  }
  return full[full.length - 1]!.cam;
}

/** CSS transform for an element with `transform-origin: 0 0` inside a perspective container. */
export function camTransform(c: Cam) {
  return `translate3d(${c.sx}px, ${c.sy}px, 0) rotateX(${c.rx}deg) rotateY(${c.ry}deg) rotateZ(${c.rz}deg) scale(${c.zoom}) translate(${-c.fx}px, ${-c.fy}px)`;
}

/** Screen position of object point (x, y) under camera `c`, matching camTransform + perspective. */
export function project(c: Cam, x: number, y: number) {
  const rad = Math.PI / 180;
  let px = c.zoom * (x - c.fx);
  let py = c.zoom * (y - c.fy);
  let pz = 0;
  // rotateZ
  const cz = Math.cos(c.rz * rad);
  const sz = Math.sin(c.rz * rad);
  [px, py] = [px * cz - py * sz, px * sz + py * cz];
  // rotateY
  const cy = Math.cos(c.ry * rad);
  const sy = Math.sin(c.ry * rad);
  [px, pz] = [px * cy + pz * sy, -px * sy + pz * cy];
  // rotateX
  const cx = Math.cos(c.rx * rad);
  const sx = Math.sin(c.rx * rad);
  [py, pz] = [py * cx - pz * sx, py * sx + pz * cx];
  const X = px + c.sx;
  const Y = py + c.sy;
  const k = PERSPECTIVE / (PERSPECTIVE - pz);
  return { x: ORIGIN[0] + (X - ORIGIN[0]) * k, y: ORIGIN[1] + (Y - ORIGIN[1]) * k, k: k * c.zoom };
}

/** Screen-space speed (px/frame) of the object's focus region, for motion blur. */
export function camVelocity(keys: Key[], frame: number, x: number, y: number) {
  const a = project(camAt(keys, frame - 1), x, y);
  const b = project(camAt(keys, frame), x, y);
  return { dx: b.x - a.x, dy: b.y - a.y, dz: b.k - a.k };
}
