import { AbsoluteFill, useCurrentFrame } from "remotion";
import { crowd } from "../../data/demo";
import { Avatar, hueFor } from "../../kit/Avatar";
import { EASE, clamp01, mix, progress, rng } from "../../kit/motion";
import { B } from "./beats";

const R = rng(42);
const NAMES = crowd(84, 11);
const CX = 540;
const CY = 760;
const F = 470;

/** Memory fragments: what a card remembers about someone. Readable mid-depth chips. */
const MEMORIES = [
  { name: "Ana Kolenič", note: "Met at Web Summit", x: 250, y: 560 },
  { name: "Valentina Dubois", note: "Moving to Lisbon", x: 800, y: 700 },
  { name: "Inês Sampaio", note: "Owes you an intro", x: 300, y: 880 },
  { name: "Nik Zupan", note: "Padel on Sundays", x: 770, y: 1060 },
  { name: "Sara Rossi", note: "Introduced by Max", x: 330, y: 1220 },
];

type Item = { name: string; note?: string; X: number; Y: number; z: number; side: number };
const ITEMS: Item[] = [
  ...NAMES.map((name) => {
    const a = R() * Math.PI * 2;
    const rad = 0.25 + Math.sqrt(R()) * 1.25;
    return { name, X: Math.cos(a) * rad, Y: Math.sin(a) * rad * 1.35, z: 0.75 + R() * 1.35, side: R() < 0.5 ? -1 : 1 };
  }),
  ...MEMORIES.map((m) => ({ name: m.name, note: m.note, X: (m.x - CX) / F, Y: (m.y - CY) / F, z: 1, side: m.x < CX ? -1 : 1 })),
];

const FOCUS_Z = 1.05;

/** Quadratic Bézier point. */
const bez = (p0: number, c: number, p1: number, u: number) => (1 - u) * (1 - u) * p0 + 2 * (1 - u) * u * c + u * u * p1;

/**
 * The hook. Faces (and five things you'd want to remember about them) float in depth, soft and
 * dim behind "You meet hundreds of people."; on "Remember every one." they rack into focus and
 * stream along curved paths, with speed streaks, into the phone's screen (`sink`).
 */
export function Hook({ sink }: { sink: (frame: number) => { x: number; y: number; s: number } }) {
  const frame = useCurrentFrame();
  if (frame > B.hookStream + 80) return null;
  const sharp = progress(frame, B.hookSharp, 12, EASE.out);
  const travel = Math.min(frame, B.hookStream) * 0.0055;
  const s = sink(frame);

  // Order the stream: closest to the phone first, so the swarm drains like a vortex.
  const placed = ITEMS.map((it, i) => {
    const z = it.z - travel * (it.note ? 0.25 : 1);
    const k = 1 / z;
    return { it, i, x0: CX + it.X * F * k, y0: CY + it.Y * F * k, k, z };
  });
  const order = [...placed].sort((a, b) => Math.hypot(a.x0 - s.x, a.y0 - s.y) - Math.hypot(b.x0 - s.x, b.y0 - s.y));
  const startOf = new Map(order.map((p, rank) => [p.i, B.hookStream + rank * 0.62]));

  let arriving = 0;
  const drawn = placed.map((p) => {
    const start = startOf.get(p.i)!;
    const u = clamp01((frame - start) / 30);
    const e = u * u * u; // accelerate into the phone
    const mx = (p.x0 + s.x) / 2;
    const my = (p.y0 + s.y) / 2;
    const dx = s.x - p.x0;
    const dy = s.y - p.y0;
    const cx = mx - dy * 0.42 * p.it.side;
    const cy = my + dx * 0.42 * p.it.side;
    const at = (q: number) => ({ x: bez(p.x0, cx, s.x, q), y: bez(p.y0, cy, s.y, q) });
    const pos = at(e);
    if (u > 0.82 && u < 1) arriving++;
    const tail = u > 0 && u < 1 ? [0.05, 0.1, 0.16, 0.22].map((d) => at(Math.max(0, e - d * (0.3 + e)))) : [];
    return { p, pos, u, tail };
  });

  return (
    <AbsoluteFill>
      <svg width={1080} height={1350} style={{ position: "absolute", inset: 0 }}>
        {drawn.map(({ p, pos, tail, u }) => {
          if (!tail.length || u < 0.08) return null;
          const hue = hueFor(p.it.name);
          const w = (p.it.note ? 26 : 60 * p.k) * (1 - 0.7 * u) * 0.5;
          const pts = [pos, ...tail];
          return pts.slice(1).map((q, j) => (
            <line
              key={`${p.i}-${j}`}
              x1={pts[j]!.x}
              y1={pts[j]!.y}
              x2={q.x}
              y2={q.y}
              stroke={`oklch(0.8 0.09 ${hue})`}
              strokeOpacity={0.55 * (1 - j / 4) * Math.min(1, u * 3)}
              strokeWidth={Math.max(1, w * (1 - j / 4.5))}
              strokeLinecap="round"
            />
          ));
        })}
      </svg>
      {drawn
        .filter(({ u }) => u < 1)
        .sort((a, b) => b.p.z - a.p.z)
        .map(({ p, pos, u }) => {
          const fade = 1 - clamp01((u - 0.82) / 0.18);
          const scale = mix(1, 0.18, u * u);
          const defocus = Math.abs(p.z - FOCUS_Z);
          const blur = mix(3 + defocus * 3.5, defocus * 1.2, sharp);
          const dim = mix(0.5, 1, sharp);
          const base = clamp01((2.4 - p.z) / 0.4);
          // Once sharp, keep the headline band clear.
          const band = mix(1, clamp01((pos.y - 380) / 90), sharp);
          if (p.it.note) {
            return (
              <div
                key={p.i}
                className="surface"
                style={{
                  position: "absolute",
                  left: pos.x,
                  top: pos.y,
                  transform: `translate(-50%, -50%) scale(${1.45 * scale * p.k})`,
                  display: "flex",
                  alignItems: "center",
                  gap: 11,
                  padding: "7px 18px 7px 7px",
                  borderRadius: 999,
                  background: "oklch(1 0 0 / 0.95)",
                  opacity: dim * fade * band,
                  filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
                  whiteSpace: "nowrap",
                  lineHeight: 1.2,
                  boxShadow: "0 12px 30px -10px rgba(0,0,0,0.5)",
                }}
              >
                <Avatar name={p.it.name} size={40} />
                <span style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 16, fontWeight: 650, letterSpacing: "-0.02em", color: "oklch(0.22 0.015 215)" }}>{p.it.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: "oklch(0.5 0.08 198)" }}>{p.it.note}</span>
                </span>
              </div>
            );
          }
          const size = 66 * p.k * scale;
          return (
            <div key={p.i} style={{ position: "absolute", left: pos.x - size / 2, top: pos.y - size / 2, opacity: dim * fade * base * band, filter: blur > 0.4 ? `blur(${blur}px)` : undefined }}>
              <Avatar name={p.it.name} size={Math.max(3, size)} ring={false} style={{ boxShadow: "0 8px 22px rgba(0,0,0,0.4)" }} />
            </div>
          );
        })}
      {arriving > 0 && (
        <div
          style={{
            position: "absolute",
            left: s.x - 260,
            top: s.y - 260,
            width: 520,
            height: 520,
            borderRadius: 999,
            background: "radial-gradient(closest-side, rgba(95,240,244,0.32), rgba(95,240,244,0))",
            opacity: Math.min(1, arriving / 6),
            mixBlendMode: "screen",
          }}
        />
      )}
    </AbsoluteFill>
  );
}
