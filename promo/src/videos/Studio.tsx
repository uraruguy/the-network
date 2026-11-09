import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, tween } from "../kit/motion";
import { camAt, project } from "../scenes/studio/camera";
import { CAM } from "../scenes/studio/camKeys";
import { CursorLayer, lisbonWin } from "../scenes/studio/CursorLayer";
import { FLIP } from "../scenes/studio/timeline";
import { World } from "../scenes/studio/World";

/** The flip's origin: the Lisbon pin on screen at the flip. */
const ORIGIN = (() => {
  const p = lisbonWin(FLIP.start);
  return project(camAt(CAM, FLIP.start), p.x, p.y);
})();

/**
 * The desktop video (1920×1080, 30 s): see STORYBOARD.md → Studio. One camera over a Mac window;
 * on the beat at FLIP the dark world is wiped in by a circle growing from the Lisbon pin.
 */
export function Studio() {
  const frame = useCurrentFrame();
  const r = tween(frame, [FLIP.start, FLIP.end], [0, 2400], EASE.inOut);
  const light = frame < FLIP.end;
  const dark = frame >= FLIP.start;
  return (
    <AbsoluteFill>
      {light && <World frame={frame} theme="light" />}
      {dark && (
        <AbsoluteFill style={light ? { clipPath: `circle(${r}px at ${ORIGIN.x}px ${ORIGIN.y}px)` } : undefined}>
          <World frame={frame} theme="dark" />
        </AbsoluteFill>
      )}
      <CursorLayer frame={frame} />
    </AbsoluteFill>
  );
}
