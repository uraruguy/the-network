import { useCurrentFrame } from "remotion";
import { EASE, SPRINGS, springAt, tween } from "../../kit/motion";

export type Seg = { text: string; accent?: boolean };
/** The kicker's data changes at `at`: the differing characters roll over (an odometer tick). */
export type KickerTick = { text: string; at: number };

function Tick({ from, to, at }: { from: string; to: string; at: number }) {
  const frame = useCurrentFrame();
  const t = springAt(frame, at, SPRINGS.snappy);
  let head = 0;
  while (head < from.length && from[head] === to[head]) head++;
  let tail = 0;
  while (tail < from.length - head && from[from.length - 1 - tail] === to[to.length - 1 - tail]) tail++;
  const cell = (text: string, y: number) => <span style={{ gridArea: "1 / 1", transform: `translateY(${y * 100}%)` }}>{text}</span>;
  return (
    <>
      {from.slice(0, head)}
      <span style={{ display: "inline-grid", height: "1lh", overflow: "hidden", verticalAlign: "top" }}>
        {cell(from.slice(head, from.length - tail), -t)}
        {cell(to.slice(head, to.length - tail), 1 - t)}
      </span>
      {from.slice(from.length - tail)}
    </>
  );
}

/** Accent words: bright aqua on the teal stage, the logo gradient on the dark stage. */
const ACCENT = "linear-gradient(100deg, #b4fbfc 0%, #6ff2f6 45%, #3fe0e6 100%)";
const ACCENT_DARK = "linear-gradient(100deg, #5ff0f4 0%, #2cc9d0 45%, #12a3ab 100%)";

/**
 * Studio's headline: an information kicker (mono chip) and one or two lines whose words rise
 * out of a blur, white on both stages. `at` may be negative so a title is already set at f0.
 */
export function Title({
  lines,
  kicker,
  tick,
  at,
  out,
  size = 66,
  dark,
  align = "center",
  stagger = 3,
}: {
  lines: Seg[][];
  kicker?: string;
  tick?: KickerTick;
  at: number;
  out?: number;
  size?: number;
  dark: boolean;
  align?: "center" | "left";
  stagger?: number;
}) {
  const frame = useCurrentFrame();
  const exit = out === undefined ? 0 : tween(frame, [out, out + 14], [0, 1], EASE.in);
  const k = springAt(frame, at - 6, SPRINGS.smooth);
  let w = 0;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: align === "center" ? "center" : "flex-start",
        textAlign: align,
        opacity: 1 - exit,
        transform: `translateY(${-30 * exit}px)`,
        filter: exit > 0.02 ? `blur(${exit * 10}px)` : undefined,
      }}
    >
      {kicker && (
        <div
          style={{
            font: `500 ${Math.round(size * 0.25)}px "JetBrains Mono Variable", monospace`,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: dark ? "#7fe6ea" : "#ffffff",
            padding: `${Math.round(size * 0.09)}px ${Math.round(size * 0.2)}px`,
            borderRadius: 999,
            border: `1px solid ${dark ? "rgba(95,240,244,0.3)" : "rgba(255,255,255,0.42)"}`,
            background: dark ? "rgba(95,240,244,0.08)" : "rgba(255,255,255,0.14)",
            marginBottom: Math.round(size * 0.26),
            opacity: k,
            transform: `translateY(${(1 - k) * 12}px)`,
          }}
        >
          {tick ? <Tick from={kicker} to={tick.text} at={tick.at} /> : kicker}
        </div>
      )}
      {lines.map((line, li) => (
        <div key={li} style={{ fontSize: size, lineHeight: 1.06, fontWeight: 700, letterSpacing: "-0.035em", color: "#ffffff", whiteSpace: "nowrap", textShadow: dark ? undefined : "0 2px 18px rgba(0,40,46,0.25)" }}>
          {line.map((seg, si) =>
            seg.text.split(/(\s+)/).map((word, wi) => {
              if (/^\s*$/.test(word)) return word;
              const p = springAt(frame, at + w++ * stagger, SPRINGS.smooth);
              return (
                <span
                  key={`${si}-${wi}`}
                  style={{
                    display: "inline-block",
                    opacity: Math.min(1, p * 1.4),
                    transform: `translateY(${(1 - p) * size * 0.42}px)`,
                    filter: p < 0.98 ? `blur(${(1 - p) * 14}px)` : undefined,
                    ...(seg.accent ? { backgroundImage: dark ? ACCENT_DARK : ACCENT, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", paddingBottom: "0.08em", textShadow: "none" } : null),
                  }}
                >
                  {word}
                </span>
              );
            }),
          )}
        </div>
      ))}
    </div>
  );
}
