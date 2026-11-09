import { AbsoluteFill } from "remotion";
import { Logo } from "../../kit/Logo";
import { EASE, SPRINGS, clamp01, springAt, tween } from "../../kit/motion";
import { Globe } from "../../ui/common/Globe";
import { GithubMark } from "../../ui/desktop/parts";
import { Title } from "./Title";
import { arcsAt } from "./WindowContent";
import type { Theme } from "./World";

/**
 * End card (1620–1800), overlapping the terminal's exit so no frame is empty: a dimmed planet
 * fills the lower third, the logo pops and the wordmark slides out from behind it, the promise,
 * then the call to action in large mono. Everything settles by ~1730 and holds still.
 */
export function Outro({ frame, theme }: { frame: number; theme: Theme }) {
  if (frame < 1614) return null;
  const dark = theme === "dark";
  const planet = tween(frame, [1614, 1670], [0, 1], EASE.out);
  const logo = springAt(frame, 1618, SPRINGS.pop);
  const word = springAt(frame, 1636, SPRINGS.smooth);
  const cta = springAt(frame, 1668, SPRINGS.smooth);
  const fact = springAt(frame, 1688, SPRINGS.soft);
  const spin = tween(frame, [1614, 1730], [0, 1], EASE.out);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 0.5 * planet, transform: `translateY(${(1 - planet) * 120}px)` }}>
        <Globe width={1920} height={1080} radius={780} center={[960, 1370]} rotate={[-(20 + 14 * spin), -38]} theme="dark" home="Lisbon" reveal={1} arcs={arcsAt(2000)} labels={false} uiScale={1.5} atmosphere={1.2} clusterAngle={0.115} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", paddingTop: 150, flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
          <div style={{ position: "relative", zIndex: 2, transform: `translateX(${(1 - word) * 340}px) scale(${0.6 + 0.4 * logo})`, opacity: clamp01(logo * 1.6), filter: "drop-shadow(0 18px 40px rgba(10,143,150,0.45))" }}>
            <Logo size={132} draw={tween(frame, [1622, 1652], [0, 1], EASE.inOut)} nodes={tween(frame, [1640, 1660], [0, 1], EASE.out)} />
          </div>
          <div
            style={{
              transform: `translateX(${-(1 - word) * 260}px)`,
              clipPath: `inset(-20% -5% -20% ${Math.max(0, (1 - word) * 600 - 26)}px)`,
              opacity: clamp01((word - 0.1) * 3),
              font: '700 112px "Inter Variable", sans-serif',
              letterSpacing: "-0.045em",
              color: dark ? "#f2fbfb" : "#ffffff",
            }}
          >
            The Network
          </div>
        </div>
        <div style={{ marginTop: 30 }}>
          <Title at={1652} lines={[[{ text: "Open source. Self-hosted. " }, { text: "Yours.", accent: true }]]} size={77} dark={dark} />
        </div>
        <div
          style={{
            marginTop: 44,
            display: "flex",
            alignItems: "center",
            gap: 18,
            padding: "20px 38px 20px 30px",
            borderRadius: 999,
            font: '600 52px "JetBrains Mono Variable", monospace',
            letterSpacing: "-0.01em",
            color: "#0b1f22",
            background: "linear-gradient(100deg, #b4fbfc, #5fe8ee)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.4), 0 0 60px -6px rgba(52,219,227,0.55), 0 20px 50px -20px rgba(0,0,0,0.6)",
            opacity: clamp01(cta * 1.3),
            transform: `translateY(${(1 - cta) * 26}px) scale(${0.94 + 0.06 * cta})`,
          }}
        >
          <span style={{ fontSize: 54 }}>★</span> Star on GitHub
          <span style={{ opacity: 0.45 }}>·</span>
          <GithubMark size={46} />
          uraruguy/the-network
        </div>
        <div style={{ marginTop: 26, font: '500 30px "Inter Variable", sans-serif', letterSpacing: "-0.005em", color: "rgba(226,246,246,0.82)", opacity: fact, transform: `translateY(${(1 - fact) * 10}px)` }}>
          Runs on Vercel + Supabase · MIT licensed
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
