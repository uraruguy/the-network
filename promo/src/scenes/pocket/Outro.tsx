import { AbsoluteFill, useCurrentFrame } from "remotion";
import { REPO_URL, TAGLINE, crowd } from "../../data/demo";
import { Avatar } from "../../kit/Avatar";
import { Logo } from "../../kit/Logo";
import { EASE, SPRINGS, clamp01, progress, rng, springAt } from "../../kit/motion";

const RING = crowd(26, 5);
const R = rng(9);
const ORBIT = RING.map((name, i) => ({ name, a: (i / RING.length) * Math.PI * 2 + R() * 0.2, r: 0.82 + R() * 0.35, s: 30 + R() * 26, d: R() * 20 }));

function GitHubMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

/** Scene 7: the logo draws itself, name, promise, what it is, where to get it. Still from ~f1772. */
export function Outro() {
  const frame = useCurrentFrame();
  if (frame < 1652) return null;
  const logoIn = springAt(frame, 1660, SPRINGS.pop);
  const draw = progress(frame, 1664, 34, EASE.inOut);
  const nodes = progress(frame, 1688, 26, EASE.out);
  const name = springAt(frame, 1694, SPRINGS.smooth);
  const tag = springAt(frame, 1706, SPRINGS.smooth);
  const chips = [0, 1, 2].map((i) => springAt(frame, 1718 + i * 5, SPRINGS.smooth));
  const urlIn = springAt(frame, 1732, SPRINGS.smooth);
  const chars = Math.floor(clamp01((frame - 1736) / 34) * REPO_URL.length);
  const settle = clamp01((frame - 1700) / 80);
  return (
    <AbsoluteFill>
      {ORBIT.map((o, i) => {
        const t = springAt(frame, 1672 + o.d, SPRINGS.soft);
        const a = o.a + frame * 0.0016;
        const x = 540 + Math.cos(a) * 460 * o.r;
        const y = 640 + Math.sin(a) * 420 * o.r;
        return (
          <div key={i} style={{ position: "absolute", left: x - o.s / 2, top: y - o.s / 2, opacity: 0.22 * t, transform: `scale(${t})`, filter: "blur(0.6px)" }}>
            <Avatar name={o.name} size={o.s} ring={false} />
          </div>
        );
      })}
      <div style={{ position: "absolute", left: 0, right: 0, top: 330, lineHeight: 1.2, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <div style={{ transform: `scale(${0.6 + 0.4 * logoIn}) translateY(${(1 - settle) * 6}px)`, opacity: clamp01(logoIn * 2), filter: `drop-shadow(0 24px 60px rgba(20,200,210,${0.35 * logoIn}))` }}>
          <Logo size={176} draw={draw} nodes={nodes} />
        </div>
        <div style={{ marginTop: 40, fontSize: 104, lineHeight: 1.05, fontWeight: 750, letterSpacing: "-0.045em", color: "#f2fbfb", opacity: name, transform: `translateY(${(1 - name) * 30}px)`, filter: name < 0.98 ? `blur(${(1 - name) * 12}px)` : undefined }}>
          The Network
        </div>
        <div style={{ marginTop: 18, fontSize: 38, lineHeight: 1.25, fontWeight: 450, letterSpacing: "-0.015em", color: "rgba(214,236,236,0.72)", opacity: tag, transform: `translateY(${(1 - tag) * 20}px)` }}>{TAGLINE}</div>
        <div style={{ marginTop: 46, display: "flex", gap: 14 }}>
          {["Open source", "Self-hosted", "MIT"].map((c, i) => (
            <span
              key={c}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 23,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#7fe6ea",
                padding: "10px 20px",
                borderRadius: 999,
                border: "1px solid rgba(95,240,244,0.28)",
                background: "rgba(95,240,244,0.07)",
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
            marginTop: 54,
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: "20px 34px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.94)",
            color: "oklch(0.22 0.015 215)",
            boxShadow: "0 24px 60px -20px rgba(20,200,210,0.45)",
            opacity: urlIn,
            transform: `scale(${0.92 + 0.08 * urlIn})`,
          }}
        >
          <GitHubMark size={34} />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: 34, fontWeight: 500, letterSpacing: "-0.01em", minWidth: REPO_URL.length * 20.4 }}>
            {REPO_URL.slice(0, chars)}
            {chars < REPO_URL.length && <span style={{ display: "inline-block", width: 3, height: 34, marginBottom: -6, background: "#0a8f96" }} />}
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
}
