import { AbsoluteFill, interpolate } from "remotion";
import { EASE, clamp01, tween } from "../../kit/motion";
import { INTROS_STUDIO } from "../../data/demo";
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
/** Wang Wei sits against Max Mustermann's label in this layout: move it clear. */
const NUDGE: Record<string, [number, number]> = { "Wang Wei": [-12, 12] };

export function Bloom({ frame }: { frame: number }) {
  if (frame > 120) return null;
  const grow = tween(frame, [-70, 78], [0, 1], (t) => t);
  const implode = tween(frame, [84, 112], [0, 1], EASE.in);
  const zoom = interpolate(frame, [0, 84], [1.62, 0.94], { extrapolateRight: "clamp", easing: EASE.out }) * (1 - 0.97 * implode);
  const pan: [number, number] = [230 * (1 - implode), 150 - 50 * implode];
  const mask = "linear-gradient(to bottom, transparent 0, transparent 270px, black 360px), linear-gradient(to right, transparent 0, transparent 300px, black 420px)";
  return (
    <AbsoluteFill style={{ opacity: 1 - tween(frame, [104, 116], [0, 1], EASE.in), WebkitMaskImage: mask, maskImage: mask, WebkitMaskComposite: "source-in", maskComposite: "intersect" }}>
      <NetworkGraph width={1920} height={1080} grow={grow} theme="dark" zoom={zoom} pan={pan} labels ambient intros={INTROS_STUDIO} nudge={NUDGE} />
    </AbsoluteFill>
  );
}

/** The counter lands on this frame; the tile's own number appears on the same frame. */
export const COUNTER_LANDS = 121;
/** The tile number's type (text-title2): the counter is this exact text, scaled. */
const TILE_FONT = { font: '600 22px/28px "Inter Variable", sans-serif', letterSpacing: "-0.012em" };
const BIG = 150 / 22;

/**
 * Hook, front layer: the big counter ticks to 285, then flies into the People tile. It is set in
 * the tile number's exact type and only scaled, so at the landing it is pixel-identical to the
 * tile's own number, which takes over on the same frame.
 */
export function BloomCounter({ frame }: { frame: number }) {
  if (frame >= COUNTER_LANDS) return null;
  const count = Math.round(tween(frame, [0, 80], [128, 285], EASE.out));
  const fly = tween(frame, [92, COUNTER_LANDS - 1], [0, 1], EASE.inOut);
  const tile = tileAt(frame);
  const start = { x: 110, y: 610 - (28 * BIG) / 2 };
  const x = start.x + (tile.x - start.x) * fly;
  const y = start.y + (tile.y - start.y) * fly - Math.sin(Math.PI * fly) * 90;
  const scale = BIG + (tile.k - BIG) * fly;
  const labels = 1 - tween(frame, [88, 100], [0, 1]);
  // Dark before it reaches the (white) window, faded over 7 frames; a soft halo keeps it legible.
  const ink = tween(frame, [92, 99], [0, 1]);
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x, top: y, transformOrigin: "0 0", transform: `scale(${scale})`, ...TILE_FONT, fontVariantNumeric: "tabular-nums", color: `color-mix(in oklab, var(--fg) ${ink * 100}%, white)`, textShadow: `0 0 ${6 / scale}px rgba(255,255,255,${0.9 * ink * (1 - fly)})`, whiteSpace: "nowrap" }}>
        {count}
      </div>
      <div style={{ position: "absolute", left: 118, top: 700, opacity: clamp01(labels), font: '500 22px "JetBrains Mono Variable", monospace', letterSpacing: "0.16em", color: "rgba(255,255,255,0.85)", lineHeight: 1.7 }}>
        PEOPLE
        <br />
        <span style={{ color: "rgba(255,255,255,0.6)" }}>79 CITIES</span>
      </div>
    </AbsoluteFill>
  );
}
