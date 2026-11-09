import { AbsoluteFill, useCurrentFrame } from "remotion";
import { EASE, SPRINGS, clamp01, progress, springAt } from "../../kit/motion";
import { B } from "./beats";
import { project, type Pose } from "./camera";

/** An element's box in screen points, measured from the layout (transform-free). */
export type Box = { x: number; y: number; w: number; h: number };
export type Anchors = Record<string, Box>;

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
    out[el.dataset.anchor!] = { x: x + root.offsetLeft, y: y + root.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
  });
  return out;
}

const CALLOUTS = [
  { id: "followups", at: B.calloutA, out: B.calloutA + 92, label: "Follow-ups find you", value: "Daily e-mail digest · Done or Snooze in one tap" },
  { id: "older", at: B.calloutB, out: B.calloutB + 74, label: "Bring your notes", value: "Years of Apple Notes, filed by AI" },
] as const;

const BOX_Y = 1168;

/**
 * Scene 3: two lower-third callouts on Nik's card, each with a leader line up into the section
 * it explains. They say what the screen can't (the digest, the import), never repeat it.
 */
export function Callouts({ cam, anchors, scroll }: { cam: (f: number) => Pose; anchors: Anchors; scroll: (f: number) => number }) {
  const frame = useCurrentFrame();
  if (frame < B.calloutA - 4 || frame > B.calloutB + 100) return null;
  const pose = cam(frame);
  return (
    <AbsoluteFill>
      {CALLOUTS.map((c) => {
        const a = anchors[c.id];
        if (!a || frame < c.at || frame > c.out + 18) return null;
        const t = springAt(frame, c.at, SPRINGS.smooth);
        const out = progress(frame, c.out, 16, EASE.in);
        const vis = clamp01(t * 1.6) * (1 - out);
        const p = project(pose, a.x + a.w - 34, a.y + a.h / 2 - scroll(frame));
        const draw = progress(frame, c.at + 4, 16, EASE.out);
        const pulse = ((frame - c.at) % 54) / 54;
        return (
          <div key={c.id} style={{ position: "absolute", inset: 0, opacity: vis }}>
            <svg width={1080} height={1350} style={{ position: "absolute", inset: 0 }}>
              <line x1={p.x} y1={BOX_Y} x2={p.x} y2={BOX_Y - (BOX_Y - p.y) * draw} stroke="#5ff0f4" strokeOpacity={0.9} strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" />
              <circle cx={p.x} cy={p.y} r={9} fill="#5ff0f4" opacity={draw} />
              <circle cx={p.x} cy={p.y} r={9 + pulse * 22} fill="none" stroke="#5ff0f4" strokeOpacity={0.7 * (1 - pulse) * draw} strokeWidth={2.5} />
            </svg>
            <div
              style={{
                position: "absolute",
                left: 70,
                right: 70,
                top: BOX_Y,
                transform: `translateY(${(1 - t) * 40}px)`,
                filter: t < 0.95 ? `blur(${(1 - t) * 8}px)` : undefined,
                padding: "20px 30px 24px",
                borderRadius: 30,
                background: "linear-gradient(180deg, rgba(14,46,48,0.94), rgba(5,24,26,0.94))",
                border: "1px solid rgba(127,230,234,0.3)",
                boxShadow: "0 30px 70px -20px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.08)",
                lineHeight: 1.2,
              }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 22, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7fe6ea", marginBottom: 8 }}>{c.label}</div>
              <div style={{ fontSize: 38, fontWeight: 650, letterSpacing: "-0.025em", color: "#f2fbfb" }}>{c.value}</div>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}
