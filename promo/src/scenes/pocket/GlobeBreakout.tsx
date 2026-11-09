import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CITIES } from "../../data/demo";
import { Avatar } from "../../kit/Avatar";
import { EASE, SPRINGS, clamp01, mix, progress, springAt, tween } from "../../kit/motion";
import { Globe, globeProjector, type GlobeArc } from "../../ui/common/Globe";
import { PHONE_GLOBE } from "../../ui/phone/GlobeScreen";
import { B } from "./beats";
import { project, type Pose } from "./camera";

/**
 * One slow rotation shared by the in-phone and the canvas globe. The view centre drifts from
 * 16°E to 52°E, so Ljubljana stays around 40% from the left while Lisbon and Tokyo both fit.
 */
export function globeRotation(frame: number): [number, number] {
  const t = tween(frame, [B.globeSwap, 1392], [0, 1], EASE.inOut);
  return [-mix(16, 52, t), -mix(30, 33, t)];
}

/** Merge distance as an angle: identical clusters at every radius, so nothing re-clusters on a zoom. */
export const CLUSTER_ANGLE = 0.13;
/** The home cluster draws above the landing pins. */
export const RAISE = ["Ljubljana"];

/** West and east, alternating. Start frames; each arc takes ARC frames to land. */
const ARCS: [string, number][] = [
  ["Lisbon", 1140],
  ["Dubai", 1156],
  ["Copenhagen", 1172],
  ["Delhi", 1188],
  ["Singapore", 1208],
  ["Tokyo", 1228],
];
const ARC = 36;
/** Both globes get the same arc list (destinations seed clusters), with the same progress. */
export const arcsAt = (frame: number): GlobeArc[] => ARCS.map(([to, at]) => ({ to, progress: progress(frame, at, ARC, EASE.inOut) }));

/** Name chips, offset from their pins with a short leader line (never on top of a cluster). */
const NAMED: { city: string; name: string; label: string; at: number; dx: number; dy: number }[] = [
  { city: "Lisbon", name: "Valentina Dubois", label: "Valentina · Lisbon", at: 1140 + ARC + 2, dx: -20, dy: 118 },
  { city: "Copenhagen", name: "Max Larsen", label: "Max · Copenhagen", at: 1172 + ARC + 2, dx: -110, dy: -150 },
  { city: "Tokyo", name: "Sara Rossi", label: "Sara · Tokyo", at: 1228 + ARC + 2, dx: -190, dy: 96 },
];
const CITY = new Map(CITIES.map((c) => [c.name, c]));

const TARGET = { x: 540, y: 905, r: 520 };
const UI = 1.45;

/**
 * Scene 5: the globe leaves the phone from exactly where the in-phone globe was, grows into the
 * canvas, arcs fly from Ljubljana west and east, three friends get name chips and the city count
 * ticks up as each arc lands. Then it returns into the Globe screen (the reverse of the breakout).
 */
export function GlobeBreakout({ cam }: { cam: (f: number) => Pose }) {
  const frame = useCurrentFrame();
  if (frame < B.breakout || frame >= B.globeHome) return null;
  const from = project(cam(Math.min(frame, B.breakout + 2)), PHONE_GLOBE.cx, PHONE_GLOBE.cy);
  const t = springAt(frame, B.breakout, SPRINGS.sheet);
  const back = progress(frame, B.globeExit, B.globeHome - B.globeExit, EASE.inOut);
  const home = project(cam(frame), PHONE_GLOBE.cx, PHONE_GLOBE.cy);
  const x = mix(mix(from.x, TARGET.x, t), home.x, back);
  const y = mix(mix(from.y, TARGET.y, t), home.y, back);
  const r = mix(mix(PHONE_GLOBE.r * from.k, TARGET.r, t), PHONE_GLOBE.r * home.k, back);
  const ui = mix(mix(0.92 * from.k, UI, t), 0.92 * home.k, back);
  const rot = globeRotation(frame);
  const landed = ARCS.filter(([, at]) => frame >= at + ARC).length;
  const overlays = 1 - progress(frame, B.globeExit - 12, 14, EASE.in);
  const proj = globeProjector(rot, r, x, y);
  const lastLand = ARCS[landed - 1]?.[1];
  const tick = lastLand === undefined ? 0 : 1 - clamp01((frame - lastLand - ARC) / 10);
  return (
    <AbsoluteFill>
      <Globe
        width={1080}
        height={1350}
        radius={r}
        center={[x, y]}
        rotate={rot}
        theme="light"
        reveal={1}
        labels
        arcs={arcsAt(frame)}
        clusterAngle={CLUSTER_ANGLE}
        raise={RAISE}
        uiScale={ui}
        atmosphere={mix(mix(0.7, 1.1, t), 0.7, back)}
      />
      <svg width={1080} height={1350} style={{ position: "absolute", inset: 0, opacity: overlays }}>
        {NAMED.map((n) => {
          const c = CITY.get(n.city)!;
          const p = proj(c.lng, c.lat);
          const s = springAt(frame, n.at, SPRINGS.pop);
          const vis = s * clamp01((p.z - 0.12) / 0.15);
          if (vis <= 0.01) return null;
          return (
            <g key={n.city} opacity={vis}>
              <line x1={p.x} y1={p.y} x2={p.x + n.dx * s} y2={p.y + n.dy * s} stroke="oklch(0.42 0.065 200)" strokeWidth={2.5} strokeLinecap="round" />
              <circle cx={p.x} cy={p.y} r={5} fill="oklch(0.42 0.065 200)" />
            </g>
          );
        })}
      </svg>
      {NAMED.map((n) => {
        const c = CITY.get(n.city)!;
        const p = proj(c.lng, c.lat);
        const s = springAt(frame, n.at, SPRINGS.pop);
        const vis = s * clamp01((p.z - 0.12) / 0.15) * overlays;
        if (vis <= 0.01) return null;
        return (
          <div
            key={n.city}
            style={{
              position: "absolute",
              left: p.x + n.dx * s,
              top: p.y + n.dy * s,
              transform: `translate(-50%, -50%) scale(${0.6 + 0.4 * s})`,
              opacity: vis,
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "7px 20px 7px 7px",
              borderRadius: 999,
              background: "oklch(1 0 0 / 0.97)",
              boxShadow: "0 14px 30px -10px rgba(0,30,40,0.45), inset 0 0 0 0.5px rgba(10,40,50,0.12)",
              whiteSpace: "nowrap",
              lineHeight: 1.2,
            }}
          >
            <Avatar name={n.name} size={40} />
            <span style={{ fontSize: 25, fontWeight: 650, letterSpacing: "-0.02em", color: "oklch(0.22 0.015 215)" }}>{n.label}</span>
          </div>
        );
      })}
      {/* The city count, ticking up as arcs land */}
      {frame >= ARCS[0]![1] && (
        <div
          style={{
            position: "absolute",
            left: 64,
            bottom: 66,
            padding: "18px 34px 22px 30px",
            borderRadius: 34,
            background: "rgba(3,22,22,0.84)",
            border: "1px solid rgba(127,230,234,0.28)",
            boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7)",
            opacity: springAt(frame, ARCS[0]![1], SPRINGS.smooth) * overlays,
            lineHeight: 1,
          }}
        >
          <div style={{ fontSize: 112, fontWeight: 750, letterSpacing: "-0.045em", color: "#f2fbfb", fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.06 * tick})`, transformOrigin: "0 80%" }}>{79 - ARCS.length + landed}</div>
          <div style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 24, letterSpacing: "0.14em", color: "#7fe6ea" }}>CITIES</div>
        </div>
      )}
    </AbsoluteFill>
  );
}
