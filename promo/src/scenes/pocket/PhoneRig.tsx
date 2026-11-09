import type { ReactNode } from "react";
import { IPhone, PHONE_OUTER_H, PHONE_OUTER_W } from "../../devices/IPhone";
import type { Pose } from "./camera";

/**
 * Places the iPhone on the canvas at a camera pose. `blur` is velocity-based motion blur (px);
 * `dim` darkens the device (it recedes behind floating UI).
 */
export function PhoneRig({ pose, blur = 0, children, overlay }: { pose: Pose; blur?: number; children: ReactNode; overlay?: ReactNode }) {
  if (pose.o <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: pose.x - PHONE_OUTER_W / 2,
        top: pose.y - PHONE_OUTER_H / 2,
        width: PHONE_OUTER_W,
        height: PHONE_OUTER_H,
        transformOrigin: "50% 50%",
        transform: `perspective(2200px) rotateX(${pose.rx}deg) rotateY(${pose.ry}deg) rotateZ(${pose.rz}deg) scale(${pose.s})`,
        opacity: pose.o,
        filter: [blur > 0.4 ? `blur(${blur.toFixed(2)}px)` : "", pose.dim > 0.001 ? `brightness(${1 - pose.dim})` : ""].join(" ") || undefined,
      }}
    >
      <IPhone glare={0.35} rim="rgba(120,230,235,0.16)">
        {children}
      </IPhone>
      {overlay}
    </div>
  );
}
