import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DarkStage, LightStage } from "../../kit/Stage";
import { EASE, tween } from "../../kit/motion";
import { Globe } from "../../ui/common/Globe";

/** Exercises <Globe>: light rotation + reveal, a zoom into Europe where clusters split, dark arcs. */
export function GlobePreview() {
  const f = useCurrentFrame();
  if (f < 340) {
    const zoom = tween(f, [200, 330], [0, 1], EASE.inOut);
    const lng = tween(f, [0, 200], [15, 70], EASE.inOut) + (12 - 70) * zoom;
    const lat = tween(f, [0, 200], [42, 30], EASE.inOut) + (47 - 30) * zoom;
    const radius = 380 + (1500 - 380) * zoom;
    return (
      <LightStage>
        <Globe width={1920} height={1080} radius={radius} rotate={[-lng, -lat]} reveal={tween(f, [10, 100], [0, 1], (t) => t)} theme="light" focus={f > 150 && f < 200 ? "Delhi" : undefined} />
      </LightStage>
    );
  }
  const g = f - 340;
  const lng = tween(g, [0, 140], [25, 45], EASE.inOut);
  const arc = (to: string, at: number) => ({ to, progress: tween(g, [at, at + 50], [0, 1], EASE.inOut) });
  return (
    <DarkStage>
      <AbsoluteFill>
        <Globe
          width={1920}
          height={1080}
          radius={430}
          rotate={[-lng, -32]}
          theme="dark"
          reveal={tween(g, [0, 50], [0, 1], (t) => t)}
          arcs={[arc("Lisbon", 0), arc("Copenhagen", 12), arc("Tokyo", 24), arc("Delhi", 36), arc("Cape Town", 48)]}
          focus={g > 110 ? "Tokyo" : undefined}
        />
      </AbsoluteFill>
    </DarkStage>
  );
}
