import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, SPRINGS, clamp01, progress, springAt } from "../../kit/motion";
import { project, type Pose } from "./camera";

export type Anchor = { x: number; y: number };
export type Anchors = Record<string, Anchor>;

/** Sums offsets up to `root`, so positions ignore every transform (camera, scroll). */
export function measureAnchors(root: HTMLElement): Anchors {
  const out: Anchors = {};
  root.querySelectorAll<HTMLElement>("[data-anchor]").forEach((el) => {
    let x = 0;
    let y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== root) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    out[el.dataset.anchor!] = { x: x + el.offsetWidth, y: y + el.offsetHeight / 2 };
  });
  return out;
}

const CALLOUTS = [
  { id: "chips", at: 744, label: "Warmth & categories", value: "Active · Design · Clients", dx: -8 },
  { id: "followup", at: 766, label: "Next follow-up", value: "Send the deck · Today", dx: -10 },
  { id: "notes", at: 832, label: "Every note", value: "Meetings, calls, messages", dx: -10, dy: 92 },
  { id: "intro", at: 892, label: "How you met", value: "Introduced by Max Larsen", dx: -10 },
] as const;

const X = 618;

/**
 * Scene 3: callout cards on the right with leader lines into Sara's card. Anchors follow the
 * card as it scrolls; a callout fades when its anchor leaves the readable band.
 */
export function Callouts({ cam, anchors, scroll }: { cam: (f: number) => Pose; anchors: Anchors; scroll: (f: number) => number }) {
  const frame = useCurrentFrame();
  if (frame < 730 || frame > 965) return null;
  const pose = cam(frame);
  const out = progress(frame, 938, 18, EASE.in);
  return (
    <AbsoluteFill style={{ opacity: 1 - out }}>
      <svg width={1080} height={1350} style={{ position: "absolute", inset: 0 }}>
        {CALLOUTS.map((c) => {
          const a = anchors[c.id];
          if (!a) return null;
          const p = project(pose, a.x + c.dx, a.y + ("dy" in c ? c.dy : 0) - scroll(frame));
          const t = springAt(frame, c.at, SPRINGS.smooth);
          const vis = band(p.y) * clamp01(t * 2);
          if (vis <= 0.01) return null;
          const len = X - 12 - p.x;
          const draw = progress(frame, c.at, 16, EASE.out);
          const pulse = ((frame - c.at) % 50) / 50;
          return (
            <g key={c.id} opacity={vis}>
              <line x1={p.x} y1={p.y} x2={p.x + len * draw} y2={p.y} stroke="rgba(127,230,234,0.75)" strokeWidth={2} strokeDasharray="2 6" strokeLinecap="round" />
              <circle cx={p.x} cy={p.y} r={7} fill="#5ff0f4" />
              <circle cx={p.x} cy={p.y} r={7 + pulse * 16} fill="none" stroke="#5ff0f4" strokeOpacity={0.6 * (1 - pulse)} strokeWidth={2} />
            </g>
          );
        })}
      </svg>
      {CALLOUTS.map((c) => {
        const a = anchors[c.id];
        if (!a) return null;
        const p = project(pose, a.x + c.dx, a.y + ("dy" in c ? c.dy : 0) - scroll(frame));
        const t = springAt(frame, c.at + 6, SPRINGS.smooth);
        const vis = band(p.y) * clamp01(t * 1.6);
        if (vis <= 0.01) return null;
        return (
          <div
            key={c.id}
            style={{
              position: "absolute",
              left: X,
              top: p.y,
              transform: `translate(${(1 - t) * 40}px, -50%)`,
              opacity: vis,
              filter: t < 0.95 ? `blur(${(1 - t) * 8}px)` : undefined,
              padding: "16px 24px 18px",
              borderRadius: 24,
              background: "linear-gradient(180deg, rgba(20,60,62,0.78), rgba(8,32,34,0.78))",
              border: "1px solid rgba(127,230,234,0.22)",
              boxShadow: "0 20px 50px -20px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
              maxWidth: 1080 - X - 36,
            }}
          >
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 19, lineHeight: 1.2, letterSpacing: "0.1em", textTransform: "uppercase", color: "#7fe6ea", marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 33, lineHeight: 1.18, fontWeight: 650, letterSpacing: "-0.025em", color: "#f2fbfb", whiteSpace: "nowrap" }}>{c.value}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

/** Readable vertical band: below the headline, above the bottom edge. */
function band(y: number) {
  return clamp01((y - 420) / 70) * clamp01((1290 - y) / 70);
}
