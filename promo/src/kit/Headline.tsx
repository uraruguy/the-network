import type { CSSProperties } from "react";
import { useCurrentFrame } from "remotion";
import { EASE, SPRINGS, springAt, tween } from "./motion";

/** A headline line is a list of segments; `accent` segments get the logo's turquoise gradient. */
export type Seg = { text: string; accent?: boolean };
export type Line = Seg[] | string;

export const ACCENT_GRADIENT = "linear-gradient(100deg, #5ff0f4 0%, #2cc9d0 45%, #12a3ab 100%)";
export const ACCENT_GRADIENT_LIGHT = "linear-gradient(100deg, #17b3bb 0%, #0a8f96 55%, #0b6f78 100%)";

type Props = {
  lines: Line[];
  kicker?: string;
  sub?: string;
  /** Frame (relative to the parent Sequence) at which the words start landing. */
  at?: number;
  /** Frame at which the headline lifts away; omit to keep it. */
  out?: number;
  size?: number;
  theme?: "dark" | "light";
  align?: "left" | "center";
  style?: CSSProperties;
  /** Frames between words. */
  stagger?: number;
};

/**
 * Kinetic headline: a mono kicker chip, then words that rise out of a soft blur one by one,
 * an optional sub line, and a lift-off exit. All motion is a pure function of the frame.
 */
export function Headline({ lines, kicker, sub, at = 0, out, size = 84, theme = "dark", align = "left", style, stagger = 3 }: Props) {
  const frame = useCurrentFrame();
  const fg = theme === "dark" ? "#f2fbfb" : "oklch(0.22 0.015 215)";
  const sub2 = theme === "dark" ? "rgba(214,236,236,0.66)" : "oklch(0.42 0.015 215)";
  const grad = theme === "dark" ? ACCENT_GRADIENT : ACCENT_GRADIENT_LIGHT;
  const exit = out === undefined ? 0 : tween(frame, [out, out + 16], [0, 1], EASE.in);

  let w = 0;
  const segsOf = (l: Line): Seg[] => (typeof l === "string" ? [{ text: l }] : l);
  const kickerIn = springAt(frame, at - 6, SPRINGS.smooth);

  return (
    <div
      style={{
        textAlign: align,
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        opacity: 1 - exit,
        transform: `translateY(${-40 * exit}px)`,
        filter: exit > 0 ? `blur(${exit * 10}px)` : undefined,
        ...style,
      }}
    >
      {kicker && (
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: Math.round(size * 0.24),
            fontWeight: 500,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: theme === "dark" ? "#7fe6ea" : "#0b7f86",
            padding: `${Math.round(size * 0.08)}px ${Math.round(size * 0.17)}px`,
            borderRadius: 999,
            border: `1px solid ${theme === "dark" ? "rgba(95,240,244,0.28)" : "rgba(10,143,150,0.25)"}`,
            background: theme === "dark" ? "rgba(95,240,244,0.07)" : "rgba(10,143,150,0.06)",
            marginBottom: Math.round(size * 0.34),
            opacity: kickerIn,
            transform: `translateY(${(1 - kickerIn) * 14}px)`,
          }}
        >
          {kicker}
        </div>
      )}
      {lines.map((line, li) => (
        <div
          key={li}
          style={{
            fontSize: size,
            lineHeight: 1.04,
            fontWeight: 700,
            letterSpacing: "-0.035em",
            color: fg,
            whiteSpace: "nowrap",
          }}
        >
          {segsOf(line).map((seg, si) =>
            seg.text.split(/(\s+)/).map((word, wi) => {
              if (/^\s+$/.test(word) || word === "") return word;
              const p = springAt(frame, at + w++ * stagger, SPRINGS.smooth);
              return (
                <span
                  key={`${si}-${wi}`}
                  style={{
                    display: "inline-block",
                    opacity: Math.min(1, p * 1.4),
                    transform: `translateY(${(1 - p) * size * 0.42}px)`,
                    filter: p < 0.98 ? `blur(${(1 - p) * 14}px)` : undefined,
                    ...(seg.accent
                      ? {
                          backgroundImage: grad,
                          WebkitBackgroundClip: "text",
                          backgroundClip: "text",
                          color: "transparent",
                          paddingBottom: "0.08em",
                        }
                      : null),
                  }}
                >
                  {word}
                </span>
              );
            }),
          )}
        </div>
      ))}
      {sub && (
        <div
          style={{
            marginTop: Math.round(size * 0.3),
            fontSize: Math.round(size * 0.33),
            lineHeight: 1.35,
            fontWeight: 450,
            letterSpacing: "-0.012em",
            color: sub2,
            opacity: springAt(frame, at + w * stagger + 4, SPRINGS.soft),
            maxWidth: size * 9,
            textWrap: "balance",
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}
