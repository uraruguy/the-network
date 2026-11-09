import { AbsoluteFill } from "remotion";
import { tween } from "../../kit/motion";
import { globeProjector } from "../../ui/common/Globe";
import { Cursor } from "../../ui/desktop/Cursor";
import { IMPORT } from "../../ui/desktop/ImportSheet";
import { camAt, project } from "./camera";
import { CAM } from "./camKeys";
import { clickState, cursorAt, type Waypoint } from "./cursor";
import { emailDone } from "./Overlays";
import { main } from "./timeline";
import { GLOBE, LISBON, globeRotate } from "./WindowContent";

/** A window-space target, projected through the camera every frame (the pointer never drifts). */
const win = (x: number, y: number) => (frame: number) => project(camAt(CAM, frame), x, y);
const inMain = (x: number, y: number) => {
  const p = main(x, y);
  return win(p.x, p.y);
};
const off = (f: (frame: number) => { x: number; y: number }, dx: number, dy: number) => (frame: number) => {
  const p = f(frame);
  return { x: p.x + dx, y: p.y + dy };
};
/** The Lisbon pin in window space at `frame`. */
export const lisbonWin = (frame: number) => {
  const p = globeProjector(globeRotate(frame), GLOBE.r, GLOBE.cx, GLOBE.cy)(LISBON.lng, LISBON.lat);
  return main(p.x, p.y);
};
const lisbon = (frame: number) => {
  const p = lisbonWin(frame);
  return project(camAt(CAM, frame), p.x, p.y);
};

const save = win(IMPORT.primary.x - 30, IMPORT.primary.y);
const showOnGlobe = inMain(869, 69);
const send = inMain(958, 828);

/** Each click: approach, click, step off the label so the payoff stays clear. */
const WAYPOINTS: Waypoint[] = [
  { f: 0, at: () => ({ x: 1500, y: 980 }) },
  { f: 176, at: () => ({ x: 1500, y: 980 }) },
  { f: 202, at: emailDone, travel: 26 },
  { f: 206, at: emailDone },
  { f: 222, at: off(emailDone, 150, 120), travel: 14 },
  { f: 540, at: off(save, 160, 120) },
  { f: 566, at: save, travel: 22 },
  { f: 572, at: save },
  { f: 588, at: off(save, 120, 110), travel: 14 },
  { f: 762, at: off(showOnGlobe, 120, 110) },
  { f: 784, at: showOnGlobe, travel: 22 },
  { f: 788, at: showOnGlobe },
  { f: 836, at: off(lisbon, 140, 120) },
  { f: 850, at: lisbon, travel: 14 },
  { f: 854, at: lisbon },
  { f: 870, at: off(lisbon, 110, 120), travel: 14 },
  { f: 1130, at: off(send, 130, 110) },
  { f: 1144, at: send, travel: 14 },
  { f: 1148, at: send },
  { f: 1162, at: off(send, 120, 100), travel: 12 },
];
const CLICKS = [204, 570, 786, 852, 1146];

/** Visible only around its clicks. */
const SHOWN: [number, number][] = [
  [170, 240],
  [536, 600],
  [756, 800],
  [832, 890],
  [1126, 1168],
];

export function CursorLayer({ frame }: { frame: number }) {
  const p = cursorAt(WAYPOINTS, frame);
  const { press, ripple } = clickState(CLICKS, frame);
  const cam = camAt(CAM, frame);
  const opacity = Math.max(0, ...SHOWN.map(([a, b]) => tween(frame, [a, a + 8], [0, 1]) * (1 - tween(frame, [b - 10, b], [0, 1]))));
  const overEmail = frame >= 170 && frame < 240;
  const scale = overEmail ? 1.5 : Math.max(1, Math.sqrt(cam.zoom)) * 1.15;
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Cursor x={p.x} y={p.y} scale={scale} press={press} ripple={ripple} opacity={opacity} dark={frame >= 960} />
    </AbsoluteFill>
  );
}
