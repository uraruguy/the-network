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

/** West and east, alternating. Start frames; each arc takes ARC frames to land. */
const ARCS: [string, number][] = [
  ["Lisbon", 1140],
  ["Dubai", 1156],
  ["London", 1172],
  ["Delhi", 1188],
  ["Copenhagen", 1204],
  ["Singapore", 1220],
  ["Tokyo", 1240],
];
const ARC = 36;
const NAMED: { city: string; name: string; label: string; at: number }[] = [
  { city: "Lisbon", name: "Valentina Dubois", label: "Valentina · Lisbon", at: 1140 + ARC + 2 },
  { city: "Copenhagen", name: "Max Larsen", label: "Max · Copenhagen", at: 1204 + ARC + 2 },
  { city: "Tokyo", name: "Sara Rossi", label: "Sara · Tokyo", at: 1240 + ARC + 2 },
];
const CITY = new Map(CITIES.map((c) => [c.name, c]));

const TARGET = { x: 540, y: 905, r: 520 };
const UI = 1.45;

/**
 * Scene 5: the globe leaves the phone from exactly where the in-phone globe was, grows into the
 * canvas, arcs fly from Ljubljana west and east, three friends get name chips and the city count
 * ticks up as each arc lands. Then it shrinks back into the next phone's screen.
 */
export function GlobeBreakout({ cam }: { cam: (f: number) => Pose }) {
  const frame = useCurrentFrame();
  if (frame < B.breakout || frame > 1400) return null;
  const from = project(cam(Math.min(frame, B.breakout + 2)), PHONE_GLOBE.cx, PHONE_GLOBE.cy);
  const t = springAt(frame, B.breakout, SPRINGS.sheet);
  // Exit: into the chat phone's screen (the reverse of the breakout).
  const back = progress(frame, B.globeExit, 52, EASE.inOut);
  const into = project(cam(frame), 201, 420);
  const x = mix(mix(from.x, TARGET.x, t), into.x, back);
  const y = mix(mix(from.y, TARGET.y, t), into.y, back);
  const r = mix(mix(PHONE_GLOBE.r * from.k, TARGET.r, t), 26 * into.k, back);
  const rot = globeRotation(frame);
  const arcs: GlobeArc[] = ARCS.map(([to, at]) => ({ to, progress: progress(frame, at, ARC, EASE.inOut) }));
  const landed = ARCS.filter(([, at]) => frame >= at + ARC).length;
  const overlays = 1 - progress(frame, B.globeExit - 10, 16, EASE.in);
  const proj = globeProjector(rot, r, x, y);
  const lastLand = ARCS[landed - 1]?.[1];
  const tick = lastLand === undefined ? 0 : 1 - clamp01((frame - lastLand - ARC) / 10);
  return (
    <AbsoluteFill style={{ opacity: 1 - clamp01((back - 0.75) / 0.25) }}>
      <Globe
        width={1080}
        height={1350}
        radius={r}
        center={[x, y]}
        rotate={rot}
        theme="light"
        reveal={1}
        labels={back < 0.4}
        arcs={back > 0.3 ? [] : arcs}
        uiScale={mix(mix(0.92 * from.k, UI, t), 0.4, back)}
        atmosphere={mix(mix(0.7, 1.1, t), 0.4, back)}
      />
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
              left: p.x,
              top: p.y - 64,
              transform: `translate(-50%, -100%) scale(${0.6 + 0.4 * s})`,
              transformOrigin: "50% 100%",
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
          <div style={{ fontSize: 112, fontWeight: 750, letterSpacing: "-0.045em", color: "#f2fbfb", fontVariantNumeric: "tabular-nums", transform: `scale(${1 + 0.06 * tick})`, transformOrigin: "0 80%" }}>{72 + landed}</div>
          <div style={{ marginTop: 6, fontFamily: "var(--font-mono)", fontSize: 24, letterSpacing: "0.14em", color: "#7fe6ea" }}>CITIES</div>
        </div>
      )}
    </AbsoluteFill>
  );
}
