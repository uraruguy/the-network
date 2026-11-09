import type { ReactNode } from "react";
import { AbsoluteFill } from "remotion";
import { MacWindow } from "../../devices/MacWindow";
import { camAt, camTransform, camVelocity, ORIGIN, PERSPECTIVE, type Key } from "./camera";

/** The headline band: nothing of the window shows above this (no ghost text under titles). */
export const BAND = 200;

/**
 * The Mac window under the camera. Motion blur is a screen-space directional Gaussian on an
 * untransformed wrapper (a filter on the 3D element itself would rasterise it at 1× and look
 * soft): subtle on glides, strong on whip moves, so page changes can hide inside them.
 */
export function WindowLayer({
  frame,
  keys,
  dark,
  children,
  band = true,
  opacity = 1,
  blurId,
}: {
  frame: number;
  keys: Key[];
  dark: boolean;
  children: ReactNode;
  band?: boolean;
  opacity?: number;
  blurId: string;
}) {
  const cam = camAt(keys, frame);
  const v = camVelocity(keys, frame, cam.fx, cam.fy);
  const dolly = Math.min(1.2, Math.abs(v.dz) * 16);
  const bx = Math.min(22, Math.abs(v.dx) * 0.11 + dolly);
  const by = Math.min(22, Math.abs(v.dy) * 0.11 + dolly);
  const blurred = bx > 0.4 || by > 0.4;
  const mask = band ? `linear-gradient(to bottom, transparent 0px, transparent ${BAND}px, black ${BAND + 30}px)` : undefined;
  return (
    <AbsoluteFill style={{ opacity, WebkitMaskImage: mask, maskImage: mask, filter: blurred ? `url(#${blurId})` : undefined }}>
      {blurred && (
        <svg width="0" height="0" style={{ position: "absolute" }}>
          <filter id={blurId} x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation={`${bx.toFixed(2)} ${by.toFixed(2)}`} />
          </filter>
        </svg>
      )}
      <AbsoluteFill style={{ perspective: PERSPECTIVE, perspectiveOrigin: `${ORIGIN[0]}px ${ORIGIN[1]}px` }}>
        <div style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0", transform: camTransform(cam) }}>
          {dark && <div style={{ position: "absolute", inset: 0, borderRadius: 16, boxShadow: "0 0 0 1px rgba(95,240,244,0.16), 0 0 120px -10px rgba(52,219,227,0.28)" }} />}
          <MacWindow dark={dark}>{children}</MacWindow>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
