import { AbsoluteFill } from "remotion";
import { REPO_URL, TAGLINE } from "../../data/demo";
import { Headline } from "../../kit/Headline";
import { Logo } from "../../kit/Logo";
import { EASE, SPRINGS, clamp01, springAt, tween } from "../../kit/motion";
import { GithubMark } from "../../ui/desktop/parts";
import type { Theme } from "./World";

/** Scene 6: the lockup. Logo draws itself and slides aside as the wordmark emerges from behind it, then the promise and the repo. Still from ~1750. */
export function Outro({ frame, theme }: { frame: number; theme: Theme }) {
  if (frame < 1656) return null;
  const dark = theme === "dark";
  const logo = springAt(frame, 1662, SPRINGS.pop);
  const word = springAt(frame, 1686, SPRINGS.smooth);
  const url = springAt(frame, 1720, SPRINGS.smooth);
  const meta = springAt(frame, 1732, SPRINGS.soft);
  const glow = tween(frame, [1660, 1720], [0, 1], EASE.out);
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ position: "absolute", width: 900, height: 900, borderRadius: 999, background: "radial-gradient(closest-side, rgba(52,219,227,0.22), transparent)", opacity: glow, top: -40 }} />
      <div style={{ display: "flex", alignItems: "center", gap: 26, transform: `translateY(${-30}px)` }}>
        <div style={{ position: "relative", zIndex: 2, transform: `translateX(${(1 - word) * 340}px) scale(${0.6 + 0.4 * logo})`, opacity: clamp01(logo * 1.6), filter: "drop-shadow(0 18px 40px rgba(10,143,150,0.45))" }}>
          <Logo size={140} draw={tween(frame, [1666, 1700], [0, 1], EASE.inOut)} nodes={tween(frame, [1690, 1712], [0, 1], EASE.out)} />
        </div>
        <div style={{ transform: `translateX(${-(1 - word) * 260}px)`, clipPath: `inset(-20% -5% -20% ${Math.max(0, (1 - word) * 600 - 26)}px)`, opacity: clamp01((word - 0.1) * 3), font: '700 116px "Inter Variable", sans-serif', letterSpacing: "-0.045em", color: dark ? "#f2fbfb" : "#0d1a1c" }}>The Network</div>
      </div>
      <div style={{ marginTop: 34 }}>
        <Headline at={1706} lines={[[{ text: "Open source. Self-hosted. " }, { text: "Yours.", accent: true }]]} size={68} theme={theme} align="center" />
      </div>
      <div style={{ marginTop: 18, font: '450 30px "Inter Variable", sans-serif', letterSpacing: "-0.01em", color: dark ? "rgba(214,236,236,0.66)" : "oklch(0.42 0.015 215)", opacity: meta }}>{TAGLINE}</div>
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 28px 16px 22px",
          borderRadius: 999,
          font: '500 32px "JetBrains Mono Variable", monospace',
          color: dark ? "#eafcfc" : "#0d1a1c",
          background: dark ? "rgba(95,240,244,0.08)" : "rgba(10,143,150,0.06)",
          border: `1px solid ${dark ? "rgba(95,240,244,0.3)" : "rgba(10,143,150,0.25)"}`,
          boxShadow: dark ? "0 0 40px -6px rgba(52,219,227,0.35)" : undefined,
          opacity: clamp01(url * 1.3),
          transform: `translateY(${(1 - url) * 20}px) scale(${0.96 + 0.04 * url})`,
        }}
      >
        <GithubMark size={34} />
        {REPO_URL}
      </div>
      <div style={{ marginTop: 22, font: '500 19px "JetBrains Mono Variable", monospace', letterSpacing: "0.14em", textTransform: "uppercase", color: dark ? "#7fe6ea" : "#0b7f86", opacity: meta * 0.9 }}>
        MIT · Next.js · Supabase · MCP
      </div>
    </AbsoluteFill>
  );
}
