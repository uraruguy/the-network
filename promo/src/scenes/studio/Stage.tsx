import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { DarkStage, Grain } from "../../kit/Stage";
import type { Theme } from "./World";

/**
 * Studio's light half: a deep, saturated turquoise stage so the white app window pops (and the
 * video stands out in X's light feed). The dark half reuses the kit's ink-teal night.
 */
function TealStage({ children }: { children?: ReactNode }) {
  const frame = useCurrentFrame();
  const t = frame / 60;
  return (
    <AbsoluteFill style={{ background: "#075a62" }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(55% 60% at ${22 + Math.sin(t * 0.4) * 6}% ${10 + Math.cos(t * 0.3) * 5}%, rgba(64,214,220,0.75), transparent 70%)`,
            `radial-gradient(50% 55% at ${84 + Math.cos(t * 0.33) * 5}% ${88 + Math.sin(t * 0.25) * 4}%, rgba(18,160,168,0.7), transparent 70%)`,
            "radial-gradient(130% 100% at 50% 40%, #0c8f97 0%, #08707a 50%, #054a52 100%)",
          ].join(","),
        }}
      />
      <Grain opacity={0.06} />
      {children}
    </AbsoluteFill>
  );
}

export function StudioStage({ theme, children }: { theme: Theme; children?: ReactNode }) {
  return theme === "dark" ? <DarkStage>{children}</DarkStage> : <TealStage>{children}</TealStage>;
}
