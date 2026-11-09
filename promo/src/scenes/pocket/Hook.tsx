import { AbsoluteFill, useCurrentFrame } from "remotion";
import { crowd } from "../../data/demo";
import { Avatar } from "../../kit/Avatar";
import { Headline } from "../../kit/Headline";
import { EASE, clamp01, mix, rng, tween } from "../../kit/motion";

const N = 150;
const NAMES = crowd(N, 11);
const R = rng(42);
/** Bubbles in a 3D box in front of the camera: (x, y) spread, z depth; every 5th is a name chip. */
const BUBBLES = NAMES.map((name, i) => {
  const a = R() * Math.PI * 2;
  const rad = 0.42 + Math.sqrt(R()) * 1.15;
  return {
    name,
    x: Math.cos(a) * rad * 1.0,
    y: Math.sin(a) * rad * 1.3,
    z: 0.75 + R() * 2.3,
    chip: i % 5 === 0,
    spin: (R() - 0.5) * 0.6,
    delay: R() * 26,
  };
});

const F = 470;
const CX = 540;
const CY = 640;

/**
 * The hook. Faces drift towards the camera like a slow flight through everyone you've met; then
 * they spiral into the phone (`sink` = its screen centre on the canvas) as it rises.
 */
export function Hook({ sink }: { sink: (frame: number) => { x: number; y: number; s: number } }) {
  const frame = useCurrentFrame();
  if (frame > 200) return null;
  const travel = frame * 0.0062;
  const items = BUBBLES.map((b, i) => {
    const z = b.z - travel;
    const k = 1 / Math.max(0.3, z);
    let x = CX + b.x * F * k;
    let y = CY + b.y * F * k;
    let size = (b.chip ? 38 : 50) * k;
    let o = clamp01((3.1 - z) / 0.7) * clamp01((z - 0.38) / 0.22);
    // Swirl into the phone.
    const w = tween(frame, [92 + b.delay, 150 + b.delay], [0, 1], EASE.inOut);
    if (w > 0) {
      const s = sink(frame);
      const ang = w * (2.4 + b.spin) * Math.PI;
      const dx = x - s.x;
      const dy = y - s.y;
      const r = Math.hypot(dx, dy) * (1 - w);
      const a0 = Math.atan2(dy, dx) + ang;
      x = s.x + Math.cos(a0) * r;
      y = s.y + Math.sin(a0) * r;
      size *= mix(1, 0.25, w);
      o *= 1 - clamp01((w - 0.55) / 0.45);
    }
    // Depth of field around the opener: faces behind the words drop back and soften.
    const inText = frame < 96 ? clamp01(1 - Math.max(Math.abs(x - CX) - 380, 0) / 80) * clamp01(1 - Math.max(Math.abs(y - (CY - 40)) - 120, 0) / 70) : 0;
    o *= 1 - 0.75 * inText;
    return { b, i, x, y, size, o, z, soft: inText };
  })
    .filter((it) => it.o > 0.01)
    .sort((a, b) => b.z - a.z);

  return (
    <AbsoluteFill>
      {items.map(({ b, i, x, y, size, o, z, soft }) => {
        const blur = (z > 2.2 ? (z - 2.2) * 2 : z < 0.6 ? (0.6 - z) * 10 : 0) + soft * 5;
        return b.chip ? (
          <div
            key={i}
            className="surface"
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) scale(${size / 40})`,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "6px 18px 6px 6px",
              borderRadius: 999,
              opacity: o,
              filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
              whiteSpace: "nowrap",
              background: "oklch(1 0 0 / 0.92)",
            }}
          >
            <Avatar name={b.name} size={36} />
            <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em", color: "oklch(0.22 0.015 215)" }}>{b.name}</span>
          </div>
        ) : (
          <div key={i} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, opacity: o, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
            <Avatar name={b.name} size={Math.max(4, size)} ring={false} style={{ boxShadow: "0 6px 18px rgba(0,0,0,0.35)" }} />
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Hook copy: a centred opener, then the promise at the chapter-headline position. */
export function HookCopy() {
  const frame = useCurrentFrame();
  if (frame > 190) return null;
  return (
    <>
      {frame < 110 && (
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 60 }}>
          <div style={{ padding: "40px 60px", background: "radial-gradient(closest-side, rgba(3,16,15,0.72), rgba(3,16,15,0))" }}>
            <Headline at={8} out={86} size={108} align="center" stagger={4} lines={["You meet", [{ text: "hundreds", accent: true }, { text: " of people." }]]} />
          </div>
        </AbsoluteFill>
      )}
      {frame >= 88 && (
        <AbsoluteFill style={{ padding: "96px 80px" }}>
          <Headline at={98} out={172} size={100} stagger={4} lines={["Remember", [{ text: "every one.", accent: true }]]} />
        </AbsoluteFill>
      )}
    </>
  );
}
