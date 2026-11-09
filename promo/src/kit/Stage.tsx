import type { ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

/**
 * Backdrops. Both carry a fine animated grain: it dithers the large soft gradients so H.264 (and
 * X's re-encode) doesn't band them.
 */
export function Grain({ opacity = 0.06 }: { opacity?: number }) {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ opacity, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <svg width="100%" height="100%">
        <filter id="grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 7} stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
}

/** Deep ink-teal night stage with two slow turquoise glows (the Pocket video). */
export function DarkStage({ children, glow = 1 }: { children?: ReactNode; glow?: number }) {
  const frame = useCurrentFrame();
  const t = frame / 60;
  const ax = 28 + Math.sin(t * 0.35) * 10;
  const ay = 18 + Math.cos(t * 0.27) * 8;
  const bx = 78 + Math.cos(t * 0.31) * 8;
  const by = 86 + Math.sin(t * 0.22) * 6;
  return (
    <AbsoluteFill style={{ background: "#03100f" }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(60% 45% at ${ax}% ${ay}%, rgba(20,170,178,${0.32 * glow}), transparent 70%)`,
            `radial-gradient(55% 40% at ${bx}% ${by}%, rgba(10,110,140,${0.28 * glow}), transparent 70%)`,
            "radial-gradient(120% 90% at 50% 50%, #062022 0%, #031312 55%, #020a0a 100%)",
          ].join(","),
        }}
      />
      <Grain opacity={0.07} />
      {children}
    </AbsoluteFill>
  );
}

/** The app's own canvas: cool white with a faint turquoise wash (the Studio video, light half). */
export function LightStage({ children }: { children?: ReactNode }) {
  const frame = useCurrentFrame();
  const t = frame / 60;
  return (
    <AbsoluteFill style={{ background: "oklch(0.975 0.006 200)" }}>
      <AbsoluteFill
        style={{
          background: [
            `radial-gradient(55% 60% at ${18 + Math.sin(t * 0.3) * 6}% ${8 + Math.cos(t * 0.25) * 5}%, oklch(0.905 0.05 195 / 0.75), transparent 70%)`,
            `radial-gradient(50% 55% at ${86 + Math.cos(t * 0.28) * 5}% ${92 + Math.sin(t * 0.2) * 4}%, oklch(0.95 0.03 195 / 0.9), transparent 70%)`,
          ].join(","),
        }}
      />
      <Grain opacity={0.035} />
      {children}
    </AbsoluteFill>
  );
}
