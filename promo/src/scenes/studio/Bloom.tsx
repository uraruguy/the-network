import { AbsoluteFill } from "remotion";
import { EASE, tween } from "../../kit/motion";
import { NetworkGraph } from "../../ui/common/Graph";
import type { Theme } from "./World";

/**
 * Scene 0: "who introduced whom" blooming out of Alex. The camera starts close on the owner and
 * eases out while the edges grow; then the whole constellation sinks back as the window rises.
 */
export function Bloom({ frame, theme }: { frame: number; theme: Theme }) {
  if (frame > 214) return null;
  const grow = tween(frame, [-16, 150], [0, 1], (t) => EASE.out(t) * 0.35 + t * 0.65);
  const exit = tween(frame, [164, 212], [0, 1], EASE.inOut);
  const zoom = tween(frame, [0, 190], [1.9, 1.22], EASE.out) * (1 - 0.35 * exit);
  return (
    <AbsoluteFill style={{ opacity: 1 - exit, filter: exit > 0.05 ? `blur(${exit * 8}px)` : undefined, transform: `translateY(${70 + exit * 120}px)` }}>
      <NetworkGraph width={1920} height={1080} grow={grow} theme={theme} zoom={zoom} labels ambient />
    </AbsoluteFill>
  );
}
