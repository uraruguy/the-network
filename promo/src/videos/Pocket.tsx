import { useCallback, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Headline, type Line } from "../kit/Headline";
import { EASE, SPRINGS, clamp01, progress, springAt } from "../kit/motion";
import { DarkStage } from "../kit/Stage";
import { B } from "../scenes/pocket/beats";
import { CaptureLift } from "../scenes/pocket/CaptureLift";
import { Callouts, measureAnchors, type Anchors } from "../scenes/pocket/Callouts";
import { dof, focus, project, speed, track, type Pose } from "../scenes/pocket/camera";
import { GlobeBreakout } from "../scenes/pocket/GlobeBreakout";
import { Hook } from "../scenes/pocket/Hook";
import { Outro } from "../scenes/pocket/Outro";
import { PhoneContent } from "../scenes/pocket/PhoneContent";
import { PhoneRig } from "../scenes/pocket/PhoneRig";

const OFF: Pose = { x: 540, y: 1960, s: 1.04, rx: 26, ry: 0, rz: 0, o: 1, dim: 0 };
const RISE: Pose = { x: 540, y: 1000, s: 1.32, rx: 4, ry: 0, rz: 0, o: 1, dim: 0 };
const RECEDE: Pose = { x: 540, y: 1150, s: 0.9, rx: 14, ry: 0, rz: 0, o: 1, dim: 0.66 };
const ARRIVE: Pose = { x: 540, y: 920, s: 1.0, rx: 0, ry: 0, rz: 0, o: 1, dim: 0 };
const TABS: Pose = { x: 540, y: 860, s: 1.15, rx: 0, ry: 0, rz: 0, o: 1, dim: 0 };
/** Where the in-phone globe sits on the canvas for the breakout and the return. */
const GLOBE: Pose = { ...TABS, ...focus(201, 512, 1.25, 540, 905) };

/** The phone's camera for the whole film. It never parks at a base pose between chapters. */
const cam = track([
  [0, OFF],
  [60, OFF],
  [130, RISE, EASE.out],
  [196, focus(201, 368, 2.0, 540, 480)],
  [336, focus(201, 372, 2.06, 540, 480), EASE.inOut],
  [392, RECEDE],
  [588, { ...RECEDE, y: 1140, s: 0.92, rx: 13 }, EASE.inOut],
  [640, ARRIVE],
  [700, focus(201, 490, 1.8, 540, 480)],
  [790, focus(201, 496, 1.84, 540, 480), EASE.inOut],
  [886, focus(201, 494, 1.86, 540, 480), EASE.inOut],
  [930, focus(201, 68, 1.6, 540, 480)],
  [1028, focus(201, 74, 1.68, 540, 480), EASE.inOut],
  [1058, TABS],
  [1062, TABS, EASE.inOut],
  [1112, GLOBE],
  [1180, { x: 540, y: 1560, s: 1.0, rx: 30, ry: 0, rz: 0, o: 0, dim: 0.3 }, EASE.in],
  [1300, { ...OFF, o: 1 }],
  [B.globeHome, GLOBE, EASE.out],
  [B.chatSwap + 2, GLOBE, EASE.inOut],
  [1404, focus(201, 560, 1.6, 540, 860)],
  [1470, focus(201, 566, 1.66, 540, 852), EASE.inOut],
  [1596, focus(201, 570, 1.7, 540, 848), EASE.inOut],
  [1632, { x: 540, y: 1100, s: 0.62, rx: 16, ry: 0, rz: 0, o: 0, dim: 0.4 }, EASE.in],
]);

/** John's card scrolls (inside the phone) from follow-ups down to older notes and how you met. */
export const personScroll = (f: number) => 470 * progress(f, 792, 42, EASE.inOut);

/** Kickers carry data. Each holds its slot from `at` to `out`; consecutive ones swap in place. */
const KICKERS: { text: string; at: number; out: number }[] = [
  { text: "Open source · Self-hosted", at: -30, out: 140 },
  { text: "3 due today", at: 146, out: 250 },
  { text: "2 due today", at: 254, out: 368 },
  { text: "AI capture", at: 374, out: 634 },
  { text: "One card per person", at: 640, out: 898 },
  { text: "jose = José", at: 906, out: 1054 },
  { text: "285 people · 79 cities", at: 1062, out: 1330 },
  { text: "Works with Claude via MCP", at: 1356, out: 1596 },
];

const accent = (text: string) => ({ text, accent: true });
const HEADLINES: { lines: Line[]; at: number; out: number; size?: number; dy?: number }[] = [
  { lines: ["You meet", [accent("hundreds"), { text: " of people." }]], at: -60, out: 56, size: 88 },
  { lines: ["Remember", [accent("every one.")]], at: 66, out: 140, size: 88 },
  { lines: ["Never miss", [{ text: "a " }, accent("follow-up.")]], at: 150, out: 368 },
  { lines: ["Jot it down.", [{ text: "AI " }, accent("files it.")]], at: 378, out: 632 },
  { lines: ["How you met.", [accent("What they said.")]], at: 644, out: 896 },
  { lines: ["Find anyone", [{ text: "in a " }, accent("second.")]], at: 910, out: 1050 },
  { lines: ["Your people,", [accent("on a globe.")]], at: 1064, out: 1328 },
  { lines: [[{ text: "Ask your " }, accent("network.")]], at: 1360, out: 1596 },
  { lines: [[{ text: "…or ask " }, accent("Claude.")]], at: 1470, out: 1596, dy: 96 },
];

const TOP = 92;
const TITLE_TOP = 168;

function Kicker({ text, at, out }: { text: string; at: number; out: number }) {
  const frame = useCurrentFrame();
  const i = springAt(frame, at, SPRINGS.snappy);
  const o = progress(frame, out, 10, EASE.inOut);
  if (i <= 0.001 || o >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 80,
        top: TOP,
        fontFamily: "var(--font-mono)",
        fontSize: 25,
        lineHeight: 1.2,
        fontWeight: 500,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#7fe6ea",
        padding: "7px 16px",
        borderRadius: 999,
        border: "1px solid rgba(95,240,244,0.28)",
        background: "rgba(95,240,244,0.07)",
        opacity: clamp01(i * 1.5) * (1 - o),
        transform: `translateY(${(1 - i) * 16 - o * 14}px)`,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );
}

/** "jose → José": a small mono hint next to the search field while the results hold. */
function SearchHint({ pose }: { pose: Pose }) {
  const frame = useCurrentFrame();
  if (frame < B.hint || frame > 1050) return null;
  const t = springAt(frame, B.hint, SPRINGS.pop) * (1 - progress(frame, 1028, 14, EASE.in));
  const p = project(pose, 300, 213);
  return (
    <div
      style={{
        position: "absolute",
        left: p.x,
        top: p.y,
        transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * t})`,
        opacity: t,
        fontFamily: "var(--font-mono)",
        fontSize: 30,
        lineHeight: 1.2,
        padding: "10px 22px",
        borderRadius: 999,
        background: "rgba(3,22,22,0.9)",
        border: "1px solid rgba(127,230,234,0.35)",
        color: "#dffafa",
        whiteSpace: "nowrap",
        boxShadow: "0 16px 40px -14px rgba(0,0,0,0.6)",
      }}
    >
      jose <span style={{ color: "#7fe6ea" }}>→</span> <span style={{ color: "#5ff0f4", fontWeight: 600 }}>José</span>
    </div>
  );
}

/** Everything under the headline band fades out above it, so no app text ghosts behind the copy. */
function Band({ strength, children }: { strength: number; children: ReactNode }) {
  const a = 1 - strength;
  const mask = `linear-gradient(180deg, rgba(0,0,0,${a}) 0px, rgba(0,0,0,${a}) 372px, #000 466px)`;
  return <AbsoluteFill style={{ WebkitMaskImage: mask, maskImage: mask }}>{children}</AbsoluteFill>;
}

/** The phone video (1080×1350, 30 s): see STORYBOARD.md → Pocket. */
export function Pocket() {
  const frame = useCurrentFrame();
  const raw = cam(frame);
  // Rising behind the shrinking globe, the phone only appears once the globe nearly fits its screen.
  const pose = frame >= 1300 && frame < B.globeHome ? { ...raw, o: raw.o * progress(frame, 1342, 10, EASE.inOut) } : raw;
  // Filters apply before the transform, so divide by the scale to get canvas pixels.
  const blur = (Math.min(1.8, Math.max(0, (speed(cam, frame) - 6) * 0.045)) + dof(frame)) / pose.s;
  const personRef = useRef<HTMLDivElement>(null);
  const [anchors, setAnchors] = useState<Anchors>({});
  useLayoutEffect(() => {
    if (!personRef.current) return;
    const a = measureAnchors(personRef.current);
    if (JSON.stringify(a) !== JSON.stringify(anchors)) setAnchors(a);
  });
  const sink = useCallback((f: number) => {
    const p = project(cam(f), 201, 437);
    return { x: p.x, y: p.y, s: p.k };
  }, []);

  return (
    <DarkStage>
      <Hook sink={sink} />
      {/* The mask lifts only once the last headline has faded (out 1596 + 16). */}
      <Band strength={1 - progress(frame, B.end + 12, 24, EASE.inOut)}>
        <PhoneRig pose={pose} blur={blur}>
          <PhoneContent frame={frame} personRef={personRef} personScroll={personScroll(frame)} />
        </PhoneRig>
        <GlobeBreakout cam={cam} />
        <CaptureLift cam={cam} anchors={anchors} />
        <Callouts cam={cam} anchors={anchors} scroll={personScroll} />
        <SearchHint pose={pose} />
      </Band>
      <Hook sink={sink} layer="memories" />
      {KICKERS.map((k) => (frame >= k.at - 2 && frame <= k.out + 10 ? <Kicker key={k.text} {...k} /> : null))}
      {HEADLINES.map((h, i) =>
        frame >= h.at - 12 && frame <= h.out + 20 ? (
          <div key={i} style={{ position: "absolute", left: 80, top: TITLE_TOP + (h.dy ?? 0) }}>
            <Headline at={h.at} out={h.out} lines={h.lines} size={h.size ?? 92} />
          </div>
        ) : null,
      )}
      <Outro />
    </DarkStage>
  );
}
