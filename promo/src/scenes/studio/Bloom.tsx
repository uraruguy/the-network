import { AbsoluteFill, interpolate } from "remotion";
import { EASE, clamp01, tween } from "../../kit/motion";
import { NetworkGraph } from "../../ui/common/Graph";
import { camAt, project } from "./camera";
import { CAM } from "./camKeys";
import { PEOPLE_TILE } from "./timeline";

/** Where the counter flies: the People tile's number in the window, at `frame`. */
const tileAt = (frame: number) => project(camAt(CAM, frame), PEOPLE_TILE.x, PEOPLE_TILE.y);

/**
 * Hook (0–120), back layer. f0 is the poster: the full title and a network already half grown
 * around "You". The camera pulls back fast while the crowd fills in, then the constellation
 * implodes into the point where the app window surfaces.
 */
export function Bloom({ frame }: { frame: number }) {
  if (frame > 120) return null;
  const grow = tween(frame, [-70, 78], [0, 1], (t) => t);
  const implode = tween(frame, [84, 112], [0, 1], EASE.in);
  const zoom = interpolate(frame, [0, 84], [2.3, 0.94], { extrapolateRight: "clamp", easing: EASE.out }) * (1 - 0.97 * implode);
  const pan: [number, number] = [230 * (1 - implode), 150 - 50 * implode];
  const mask = "linear-gradient(to bottom, transparent 0, transparent 270px, black 360px), linear-gradient(to right, transparent 0, transparent 330px, black 560px)";
  return (
    <AbsoluteFill style={{ opacity: 1 - tween(frame, [104, 116], [0, 1], EASE.in), WebkitMaskImage: mask, maskImage: mask, WebkitMaskComposite: "source-in", maskComposite: "intersect" }}>
      <NetworkGraph width={1920} height={1080} grow={grow} theme="dark" zoom={zoom} pan={pan} labels ambient />
    </AbsoluteFill>
  );
}

/** Hook, front layer: the big counter ticks to 285, then flies into the People tile. */
export function BloomCounter({ frame }: { frame: number }) {
  if (frame > 132) return null;
  const count = Math.round(tween(frame, [0, 80], [128, 285], EASE.out));
  const fly = tween(frame, [92, 122], [0, 1], EASE.inOut);
  const tile = tileAt(frame);
  const start = { x: 110, y: 610 };
  const cx = start.x + (tile.x - start.x) * fly;
  const cy = start.y + (tile.y - start.y) * fly - Math.sin(Math.PI * fly) * 90;
  const scale = 1 + ((22 * tile.k) / 150 - 1) * fly;
  const labels = 1 - tween(frame, [88, 100], [0, 1]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: cx, top: cy, transformOrigin: "0 50%", transform: `translateY(-50%) scale(${scale})`, opacity: 1 - tween(frame, [117, 123], [0, 1]) }}>
        <div style={{ font: '700 150px/1 "Inter Variable", sans-serif', letterSpacing: "-0.05em", color: fly > 0.85 ? "var(--fg)" : "#fff", fontVariantNumeric: "tabular-nums", textShadow: fly > 0.5 ? undefined : "0 6px 30px rgba(0,40,46,0.35)" }}>{count}</div>
      </div>
      <div style={{ position: "absolute", left: 118, top: 700, opacity: clamp01(labels), font: '500 22px "JetBrains Mono Variable", monospace', letterSpacing: "0.16em", color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
        PEOPLE
        <br />
        <span style={{ color: "rgba(255,255,255,0.6)" }}>79 CITIES</span>
      </div>
    </AbsoluteFill>
  );
}
