import { AbsoluteFill, useCurrentFrame } from "remotion";
import { REPO_URL, TAGLINE, crowd } from "../../data/demo";
import { Avatar } from "../../kit/Avatar";
import { Logo } from "../../kit/Logo";
import { EASE, SPRINGS, clamp01, progress, rng, springAt } from "../../kit/motion";

const RING = crowd(26, 5);
const R = rng(9);
const ORBIT = RING.map((name, i) => ({ name, a: (i / RING.length) * Math.PI * 2 + R() * 0.2, r: 0.84 + R() * 0.3, s: 30 + R() * 26, d: R() * 20 }));
const START = 1620;

function GitHubMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/**
 * Scene 7: the tile and its N draw together, then name, promise, what it is, and the repo as a
 * big pill with a star line. Everything is settled by ~f1738; the last second is still.
 */
export function Outro() {
  const frame = useCurrentFrame();
  if (frame < START) return null;
  const logoIn = springAt(frame, START + 2, SPRINGS.pop);
  // The tile only shows as its N draws, so it's never an empty turquoise square.
  const draw = progress(frame, START + 2, 24, EASE.out);
  const nodes = progress(frame, START + 10, 18, EASE.out);
  const name = springAt(frame, START + 26, SPRINGS.smooth);
  const tag = springAt(frame, START + 38, SPRINGS.smooth);
  const chips = [0, 1, 2].map((i) => springAt(frame, START + 48 + i * 4, SPRINGS.smooth));
  const url = springAt(frame, START + 70, SPRINGS.smooth);
  const star = springAt(frame, START + 82, SPRINGS.smooth);
  return (
    <AbsoluteFill style={{ lineHeight: 1.2 }}>
      {ORBIT.map((o, i) => {
        const t = springAt(frame, START + 10 + o.d, SPRINGS.soft);
        const a = o.a + 0.14 * progress(frame, START, 118, EASE.out);
        const x = 540 + Math.cos(a) * 470 * o.r;
        const y = 660 + Math.sin(a) * 470 * o.r;
        return (
          <div key={i} style={{ position: "absolute", left: x - o.s / 2, top: y - o.s / 2, opacity: 0.2 * t, transform: `scale(${t})`, filter: "blur(0.6px)" }}>
            <Avatar name={o.name} size={o.s} ring={false} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 236, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
        <div style={{ transform: `scale(${0.55 + 0.45 * logoIn})`, opacity: clamp01(draw * 3.5), filter: `drop-shadow(0 24px 60px rgba(20,200,210,${0.35 * logoIn}))` }}>
          <Logo size={168} draw={draw} nodes={nodes} />
        </div>
        <div style={{ marginTop: 36, fontSize: 108, lineHeight: 1.05, fontWeight: 750, letterSpacing: "-0.045em", color: "#f2fbfb", opacity: name, transform: `translateY(${(1 - name) * 30}px)`, filter: name < 0.98 ? `blur(${(1 - name) * 12}px)` : undefined }}>
          The Network
        </div>
        <div style={{ marginTop: 18, fontSize: 46, lineHeight: 1.2, fontWeight: 500, letterSpacing: "-0.02em", color: "rgba(222,242,242,0.82)", opacity: tag, transform: `translateY(${(1 - tag) * 20}px)`, maxWidth: 900 }}>{TAGLINE}</div>
        <div style={{ marginTop: 40, display: "flex", gap: 16 }}>
          {["Open source", "Self-hosted", "MIT"].map((c, i) => (
            <span
              key={c}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 30,
                fontWeight: 500,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#8ff0f3",
                padding: "12px 24px",
                borderRadius: 999,
                border: "1.5px solid rgba(95,240,244,0.34)",
                background: "rgba(95,240,244,0.08)",
                opacity: chips[i],
                transform: `translateY(${(1 - chips[i]!) * 16}px)`,
              }}
            >
              {c}
            </span>
          ))}
        </div>
        <div
          style={{
            marginTop: 64,
            display: "flex",
            alignItems: "center",
            gap: 20,
            padding: "26px 44px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.97)",
            color: "oklch(0.2 0.015 215)",
            boxShadow: "0 30px 70px -20px rgba(20,200,210,0.5)",
            opacity: url,
            transform: `scale(${0.9 + 0.1 * url})`,
          }}
        >
          <GitHubMark size={48} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em" }}>{REPO_URL}</span>
        </div>
        <div style={{ marginTop: 28, fontSize: 36, fontWeight: 600, letterSpacing: "-0.015em", color: "#f2fbfb", opacity: star, transform: `translateY(${(1 - star) * 14}px)` }}>
          <span style={{ color: "#ffd166" }}>★</span> Star it on GitHub
        </div>
      </div>
    </AbsoluteFill>
  );
}
