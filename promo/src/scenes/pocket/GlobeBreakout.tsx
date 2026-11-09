import { AbsoluteFill, useCurrentFrame } from "remotion";
import { STATS } from "../../data/demo";
import { EASE, SPRINGS, mix, progress, springAt, tween } from "../../kit/motion";
import { Globe, type GlobeArc } from "../../ui/common/Globe";
import { PHONE_GLOBE } from "../../ui/phone/GlobeScreen";
import { project, type Pose } from "./camera";

export const BREAK_AT = 1232;

/** One continuous rotation for the in-phone and the canvas globe: Atlantic → Europe → Asia. */
export function globeRotation(frame: number): [number, number] {
  const t = tween(frame, [1160, 1440], [0, 1], EASE.inOut);
  return [mix(30, -112, t), mix(-40, -28, t)];
}

const ARCS: [string, number][] = [
  ["Lisbon", 1246],
  ["Copenhagen", 1256],
  ["Nairobi", 1270],
  ["Dubai", 1286],
  ["Delhi", 1302],
  ["Singapore", 1320],
  ["Tokyo", 1336],
  ["Seoul", 1348],
  ["Sydney", 1364],
];

const TARGET = { x: 540, y: 905, r: 520 };

/**
 * Scene 5 climax: the globe leaves the phone. It starts exactly where the in-phone globe was,
 * grows past the device into the canvas, and friends' cities light up with arcs from home.
 */
export function GlobeBreakout({ cam }: { cam: (f: number) => Pose }) {
  const frame = useCurrentFrame();
  if (frame < BREAK_AT || frame > 1444) return null;
  const from = project(cam(frame), PHONE_GLOBE.cx, PHONE_GLOBE.cy);
  const fromR = PHONE_GLOBE.r * from.k;
  const t = springAt(frame, BREAK_AT, SPRINGS.sheet);
  const leave = progress(frame, 1408, 34, EASE.in);
  const x = mix(from.x, TARGET.x, t);
  const y = mix(from.y, TARGET.y, t);
  const r = mix(mix(fromR, TARGET.r, t), 1500, leave);
  const arcs: GlobeArc[] = ARCS.map(([to, at]) => ({ to, progress: progress(frame, at, 38, EASE.inOut) }));
  const count = progress(frame, 1250, 130, EASE.out);
  return (
    <AbsoluteFill style={{ opacity: 1 - leave, filter: leave > 0 ? `blur(${leave * 10}px)` : undefined }}>
      <Globe
        width={1080}
        height={1350}
        radius={r}
        center={[x, y]}
        rotate={globeRotation(frame)}
        theme="light"
        reveal={1}
        labels
        arcs={arcs}
        uiScale={mix(0.92 * from.k, 1.75, t)}
        atmosphere={mix(0.7, 1.15, t)}
      />
      <div
        style={{
          position: "absolute",
          left: "50%",
          bottom: 70,
          transform: `translateX(-50%) translateY(${(1 - springAt(frame, 1262, SPRINGS.smooth)) * 30}px)`,
          opacity: springAt(frame, 1262, SPRINGS.smooth) * (1 - leave),
          fontFamily: "var(--font-mono)",
          fontSize: 28,
          lineHeight: 1.2,
          letterSpacing: "0.08em",
          color: "#dffafa",
          padding: "14px 28px",
          borderRadius: 999,
          background: "rgba(3,22,22,0.72)",
          border: "1px solid rgba(127,230,234,0.3)",
          boxShadow: "0 20px 40px -20px rgba(0,0,0,0.6)",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ color: "#5ff0f4", fontWeight: 600 }}>{Math.round(STATS.people * count)}</span> PEOPLE ·{" "}
        <span style={{ color: "#5ff0f4", fontWeight: 600 }}>{Math.round(STATS.cities * count)}</span> CITIES
      </div>
    </AbsoluteFill>
  );
}
