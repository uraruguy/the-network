import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { MacWindow } from "../../devices/MacWindow";
import { camAt, camTransform, camVelocity, ORIGIN, PERSPECTIVE, type Key } from "./camera";

/**
 * The Mac window under the camera, with velocity-based directional motion blur and a soft
 * mask that dissolves it under the headline band.
 */
export function WindowLayer({
  frame,
  keys,
  dark,
  children,
  maskTop = 0,
  opacity = 1,
  blurId,
}: {
  frame: number;
  keys: Key[];
  dark: boolean;
  children: ReactNode;
  /** y (px) above which the window fades out; 0 = no mask. */
  maskTop?: number;
  opacity?: number;
  blurId: string;
}) {
  const cam = camAt(keys, frame);
  const v = camVelocity(keys, frame, cam.fx, cam.fy);
  // Screen-space smear: along the pan, plus a hint for fast dollies. Kept subtle (≤ 4 px).
  const bx = Math.min(4, Math.abs(v.dx) * 0.09 + Math.abs(v.dz) * 40);
  const by = Math.min(4, Math.abs(v.dy) * 0.09 + Math.abs(v.dz) * 40);
  const blurred = bx > 0.4 || by > 0.4;
  const mask = maskTop > 0 ? `linear-gradient(to bottom, transparent 0px, transparent ${maskTop}px, black ${maskTop + 110}px)` : undefined;
  return (
    <AbsoluteFill style={{ opacity, WebkitMaskImage: mask, maskImage: mask }}>
      {blurred && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id={blurId} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={`${(bx / Math.max(0.3, cam.zoom)).toFixed(2)} ${(by / Math.max(0.3, cam.zoom)).toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <AbsoluteFill style={{ perspective: PERSPECTIVE, perspectiveOrigin: `${ORIGIN[0]}px ${ORIGIN[1]}px` }}>
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: camTransform(cam), filter: blurred ? `url(#${blurId})` : undefined }}>
          {dark && <div style={{ position: "absolute", inset: 0, borderRadius: 16, boxShadow: "0 0 0 1px rgba(95,240,244,0.16), 0 0 120px -10px rgba(52,219,227,0.28)" }} />}
          <MacWindow dark={dark}>{children}</MacWindow>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
