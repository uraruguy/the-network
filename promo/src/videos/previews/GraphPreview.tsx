import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DarkStage, LightStage } from "../../kit/Stage";
import { EASE, tween } from "../../kit/motion";
import { NetworkGraph, panTo } from "../../ui/common/Graph";

/** Exercises <NetworkGraph>: grow (light), push-in + highlighted chain, then dark. */
export function GraphPreview() {
  const f = useCurrentFrame();
  const W = 1920;
  const H = 1080;
  if (f < 340) {
    const push = tween(f, [220, 320], [0, 1], EASE.inOut);
    const zoom = tween(f, [0, 220], [1.25, 1], EASE.out) + 0.8 * push;
    const target = panTo("Hanako Yamada", W, H, zoom);
    return (
      <LightStage>
        <AbsoluteFill>
          <NetworkGraph width={W} height={H} grow={tween(f, [4, 200], [0, 1], (t) => t)} zoom={zoom} pan={[target[0] * push, target[1] * push]} highlight="Marie Dupont" highlightAmount={tween(f, [240, 290], [0, 1])} />
        </AbsoluteFill>
      </LightStage>
    );
  }
  const g = f - 340;
  return (
    <DarkStage>
      <AbsoluteFill>
        <NetworkGraph width={W} height={H} grow={1} theme="dark" zoom={tween(g, [0, 140], [0.95, 1.1], EASE.inOut)} highlight="Li Si" highlightAmount={tween(g, [30, 80], [0, 1])} />
      </AbsoluteFill>
    </DarkStage>
  );
}
