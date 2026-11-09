import type { CSSProperties, ReactNode } from "react";

/** Logical screen of a 6.3" iPhone Pro, in points. Screens are laid out at this size, then scaled. */
export const PHONE_W = 402;
export const PHONE_H = 874;
const BEZEL = 13;
const SCREEN_R = 60;
export const PHONE_OUTER_W = PHONE_W + BEZEL * 2;
export const PHONE_OUTER_H = PHONE_H + BEZEL * 2;

function StatusBar({ dark, time }: { dark: boolean; time: string }) {
  const c = dark ? "#fff" : "#0d1a1c";
  return (
    <div
      style={{
        position: "absolute",
        inset: "0 0 auto 0",
        height: 54,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "6px 30px 0 44px",
        color: c,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      <span style={{ fontSize: 17, fontWeight: 600, letterSpacing: "-0.02em" }}>{time}</span>
      <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
        <svg width="19" height="12" viewBox="0 0 19 12" fill={c}>
          <rect x="0" y="8" width="3.2" height="4" rx="1" />
          <rect x="5" y="5.5" width="3.2" height="6.5" rx="1" />
          <rect x="10" y="3" width="3.2" height="9" rx="1" />
          <rect x="15" y="0" width="3.2" height="12" rx="1" />
        </svg>
        <svg width="17" height="12" viewBox="0 0 17 12" fill={c}>
          <path d="M8.5 2.3c2.4 0 4.6.9 6.3 2.5l1.2-1.2A10.6 10.6 0 0 0 8.5.6 10.6 10.6 0 0 0 1 3.6l1.2 1.2a9 9 0 0 1 6.3-2.5Z" />
          <path d="M8.5 5.6c1.5 0 2.9.6 4 1.6l1.2-1.2a7.3 7.3 0 0 0-10.4 0l1.2 1.2c1.1-1 2.5-1.6 4-1.6Z" />
          <path d="M8.5 8.9c.6 0 1.2.2 1.6.6L8.5 11.2 6.9 9.5c.4-.4 1-.6 1.6-.6Z" />
        </svg>
        <svg width="27" height="13" viewBox="0 0 27 13" fill="none">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.8" stroke={c} strokeOpacity="0.4" />
          <rect x="2" y="2" width="20" height="9" rx="2.5" fill={c} />
          <path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2Z" fill={c} fillOpacity="0.45" />
        </svg>
      </span>
    </div>
  );
}

type Props = {
  children: ReactNode;
  /** Content theme: picks the status bar colour and the screen's base colour. */
  dark?: boolean;
  style?: CSSProperties;
  /** Dims a soft reflection across the glass (0 = none). */
  glare?: number;
  /** Rim light colour for dark stages. */
  rim?: string;
  statusBar?: boolean;
  /** Status-bar clock. */
  time?: string;
};

/**
 * A modern iPhone Pro: titanium edge, black bezel, Dynamic Island, status bar. Content renders in a
 * 402×874 pt screen; scale the whole device with a transform on a wrapper.
 */
export function IPhone({ children, dark = false, style, glare = 0.5, rim, statusBar = true, time = "9:41" }: Props) {
  return (
    <div
      style={{
        position: "relative",
        width: PHONE_OUTER_W,
        height: PHONE_OUTER_H,
        borderRadius: SCREEN_R + BEZEL,
        background: "linear-gradient(145deg, #3c4447 0%, #1b1f21 30%, #0b0d0e 55%, #2a3134 100%)",
        padding: 2.5,
        boxShadow: [
          rim ? `0 0 0 1px ${rim}` : "0 0 0 1px rgba(255,255,255,0.06)",
          "0 2px 4px rgba(0,0,0,0.25)",
          "0 40px 90px -20px rgba(0,0,0,0.55)",
          "0 90px 160px -40px rgba(0,0,0,0.45)",
        ].join(","),
        ...style,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 2.5,
          borderRadius: SCREEN_R + BEZEL - 2.5,
          background: "#050607",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)",
        }}
      />
      <div
        className={dark ? "dark" : undefined}
        style={{
          position: "absolute",
          left: BEZEL,
          top: BEZEL,
          width: PHONE_W,
          height: PHONE_H,
          borderRadius: SCREEN_R,
          overflow: "hidden",
          background: "var(--bg)",
          color: "var(--fg)",
          isolation: "isolate",
        }}
      >
        {children}
        {statusBar && <StatusBar dark={dark} time={time} />}
        <div
          style={{
            position: "absolute",
            top: 11,
            left: "50%",
            width: 124,
            height: 36,
            marginLeft: -62,
            borderRadius: 20,
            background: "#000",
            zIndex: 60,
          }}
        />
        {glare > 0 && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 70,
              pointerEvents: "none",
              background: `linear-gradient(115deg, rgba(255,255,255,${0.16 * glare}) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 70%, rgba(255,255,255,${0.05 * glare}) 100%)`,
            }}
          />
        )}
      </div>
    </div>
  );
}
