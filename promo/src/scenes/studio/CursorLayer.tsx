import { AbsoluteFill } from "remotion";
import { tween } from "../../kit/motion";
import { globeProjector } from "../../ui/common/Globe";
import { Cursor } from "../../ui/desktop/Cursor";
import { IMPORT } from "../../ui/desktop/ImportSheet";
import { camAt, project } from "./camera";
import { CAM } from "./camKeys";
import { clickState, cursorAt, type Waypoint } from "./cursor";
import { DARK_SEG, EMAIL_DONE } from "./Overlays";
import { FLIP, main } from "./timeline";
import { GLOBE, globeRotate } from "./WindowContent";

/** A window-space target, projected through the camera at the current frame. */
const win = (x: number, y: number) => (frame: number) => project(camAt(CAM, frame), x, y);
const inMain = (x: number, y: number) => {
  const p = main(x, y);
  return win(p.x, p.y);
};
const screen = (x: number, y: number) => () => ({ x, y });
const nav = (i: number) => win(98, 38 + 108 + i * 48);
const lisbon = (frame: number) => {
  const p = globeProjector(globeRotate(frame), GLOBE.r, GLOBE.cx, GLOBE.cy)(-9.1393, 38.7223);
  return inMain(p.x, p.y)(frame);
};

export const WAYPOINTS: Waypoint[] = [
  { f: 0, at: screen(2080, 1180) },
  { f: 286, at: screen(1480, 900), travel: 40 },
  { f: 326, at: inMain(120, 484), travel: 34 },
  { f: 352, at: inMain(120, 484) },
  { f: 410, at: screen(1240, 860), travel: 40 },
  { f: 458, at: () => EMAIL_DONE, travel: 30 },
  { f: 470, at: () => EMAIL_DONE },
  { f: 520, at: screen(1560, 900), travel: 40 },
  { f: 720, at: screen(1560, 900) },
  { f: 746, at: win(IMPORT.primary.x - 20, IMPORT.primary.y), travel: 28 },
  { f: 760, at: win(IMPORT.primary.x - 20, IMPORT.primary.y) },
  { f: 808, at: nav(1), travel: 36 },
  { f: 816, at: nav(1) },
  { f: 843, at: inMain(330, 133), travel: 24 },
  { f: 870, at: inMain(560, 150), travel: 24 },
  { f: 898, at: inMain(330, 249), travel: 26 },
  { f: 906, at: inMain(330, 249) },
  { f: 990, at: screen(1520, 930), travel: 50 },
  { f: 1040, at: screen(1520, 930) },
  { f: 1076, at: nav(2), travel: 34 },
  { f: 1084, at: nav(2) },
  { f: 1174, at: lisbon, travel: 40 },
  { f: 1200, at: lisbon },
  { f: 1248, at: () => DARK_SEG, travel: 36 },
  { f: 1262, at: () => DARK_SEG },
  { f: 1330, at: screen(1060, 960), travel: 50 },
  { f: 1350, at: screen(1060, 960) },
  { f: 1382, at: nav(3), travel: 30 },
  { f: 1390, at: nav(3) },
  { f: 1442, at: inMain(958, 828), travel: 52 },
  { f: 1452, at: inMain(958, 828) },
  { f: 1530, at: screen(1780, 1010), travel: 60 },
];
export const CLICKS = [330, 462, 752, 812, 846, 902, 1080, 1178, FLIP.click, 1386, 1446];

export function CursorLayer({ frame }: { frame: number }) {
  const p = cursorAt(WAYPOINTS, frame);
  const { press, ripple } = clickState(CLICKS, frame);
  const cam = camAt(CAM, frame);
  const overlay = (frame >= 440 && frame < 480) || (frame >= 1230 && frame < 1270);
  const scale = overlay ? 1.25 : Math.max(1, Math.sqrt(cam.zoom)) * 1.12;
  const opacity = tween(frame, [270, 286], [0, 1]) * (1 - tween(frame, [1580, 1610], [0, 1]));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <Cursor x={p.x} y={p.y} scale={scale} press={press} ripple={ripple} opacity={opacity} dark={frame >= FLIP.start} />
    </AbsoluteFill>
  );
}
