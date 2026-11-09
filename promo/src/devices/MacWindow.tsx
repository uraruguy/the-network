import type { CSSProperties, ReactNode } from "react";
import { Logo } from "../kit/Logo";

/** Logical size of the app window's content area (the installed web app, "Add to Dock"). */
export const MAC_W = 1440;
export const MAC_H = 900;
const BAR = 38;

type Props = {
  children: ReactNode;
  dark?: boolean;
  /** 0 = light chrome, 1 = dark chrome (the Studio video cross-fades the theme). */
  title?: string;
  style?: CSSProperties;
};

/**
 * A macOS window around the installed app: unified title bar with traffic lights and the app
 * name, 1440×900 pt content area, big soft shadow. Scale it with a transform on a wrapper.
 */
export function MacWindow({ children, dark = false, title = "The Network", style }: Props) {
  return (
    <div
      className={dark ? "dark" : undefined}
      style={{
        position: "relative",
        width: MAC_W,
        height: MAC_H + BAR,
        borderRadius: 16,
        overflow: "hidden",
        background: "var(--bg)",
        color: "var(--fg)",
        boxShadow: [
          dark ? "0 0 0 1px rgba(255,255,255,0.12)" : "0 0 0 1px rgba(10,40,50,0.10)",
          "0 2px 6px rgba(0,20,30,0.10)",
          "0 40px 100px -30px rgba(0,30,40,0.40)",
          "0 80px 180px -60px rgba(0,30,40,0.35)",
        ].join(","),
        isolation: "isolate",
        ...style,
      }}
    >
      <div
        style={{
          height: BAR,
          display: "flex",
          alignItems: "center",
          position: "relative",
          padding: "0 16px",
          background: dark ? "oklch(0.2 0.012 215)" : "oklch(0.965 0.006 200)",
          borderBottom: `1px solid ${dark ? "rgba(255,255,255,0.06)" : "rgba(10,40,50,0.07)"}`,
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", gap: 8 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <span key={c} style={{ width: 12, height: 12, borderRadius: 99, background: c, boxShadow: "inset 0 0 0 0.5px rgba(0,0,0,0.12)" }} />
          ))}
        </div>
        <div
          style={{
            position: "absolute",
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 7,
            fontSize: 13,
            fontWeight: 600,
            color: dark ? "rgba(255,255,255,0.78)" : "rgba(13,26,28,0.72)",
          }}
        >
          <Logo size={16} />
          {title}
        </div>
      </div>
      <div style={{ position: "relative", width: MAC_W, height: MAC_H, overflow: "hidden" }}>{children}</div>
    </div>
  );
}
