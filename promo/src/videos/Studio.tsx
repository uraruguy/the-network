import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, tween } from "../kit/motion";
import { CursorLayer } from "../scenes/studio/CursorLayer";
import { DARK_SEG } from "../scenes/studio/Overlays";
import { FLIP } from "../scenes/studio/timeline";
import { World } from "../scenes/studio/World";

/**
 * The desktop video (1920×1080, 30 s): see STORYBOARD.md → Studio. One continuous camera over a
 * Mac window; at FLIP the dark world is revealed through a circle growing from the click.
 */
export function Studio() {
  const frame = useCurrentFrame();
  const r = tween(frame, [FLIP.start, FLIP.end], [0, 2350], EASE.inOut);
  const light = frame < FLIP.end;
  const dark = frame >= FLIP.start;
  return (
    <AbsoluteFill>
      {light && <World frame={frame} theme="light" />}
      {dark && (
        <AbsoluteFill style={light ? { clipPath: `circle(${r}px at ${DARK_SEG.x}px ${DARK_SEG.y}px)` } : undefined}>
          <World frame={frame} theme="dark" />
        </AbsoluteFill>
      )}
      <CursorLayer frame={frame} />
    </AbsoluteFill>
  );
}
