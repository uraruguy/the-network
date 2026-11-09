import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Headline, type Line } from "../kit/Headline";
import { EASE, progress } from "../kit/motion";
import { DarkStage } from "../kit/Stage";
import { CaptureLift } from "../scenes/pocket/CaptureLift";
import { Callouts, measureAnchors, type Anchors } from "../scenes/pocket/Callouts";
import { BASE, focus, project, speed, track } from "../scenes/pocket/camera";
import { GlobeBreakout } from "../scenes/pocket/GlobeBreakout";
import { Hook, HookCopy } from "../scenes/pocket/Hook";
import { Outro } from "../scenes/pocket/Outro";
import { PhoneContent } from "../scenes/pocket/PhoneContent";
import { PhoneRig } from "../scenes/pocket/PhoneRig";

const OFF = { x: 540, y: 1960, s: 1, rx: 26, ry: 0, rz: 0, o: 1, dim: 0 };
const LEFT = { x: 300, y: 985, s: 1.22, rx: 0, ry: -9, rz: 0, o: 1, dim: 0 };

/** The phone's camera for the whole film (see STORYBOARD.md, Pocket). */
const cam = track([
  [0, OFF],
  [96, OFF],
  [186, BASE],
  [246, { ...BASE, s: 1.14, y: 928 }, EASE.inOut],
  [292, focus(201, 452, 2.0, 540, 860)],
  [334, focus(201, 456, 2.04, 540, 860), EASE.inOut],
  [390, focus(201, 560, 1.55, 540, 862)],
  [416, focus(201, 562, 1.56, 540, 862), EASE.inOut],
  [456, { x: 540, y: 1010, s: 0.95, rx: 12, ry: 0, rz: 0, o: 1, dim: 0.62 }],
  [672, { x: 540, y: 1000, s: 0.97, rx: 11, dim: 0.62 }, EASE.inOut],
  [724, LEFT],
  [940, { ...LEFT, y: 915, s: 1.08 }, EASE.inOut],
  [988, BASE],
  [1000, BASE, EASE.inOut],
  [1026, focus(201, 300, 1.8, 540, 822)],
  [1138, focus(201, 345, 1.92, 540, 822), EASE.inOut],
  [1176, BASE],
  [1232, { ...BASE, s: 1.16, y: 925 }, EASE.inOut],
  [1300, { x: 540, y: 1760, s: 0.92, rx: 32, ry: 0, rz: 0, o: 0, dim: 0.3 }, EASE.in],
  [1420, { ...OFF, o: 1, dim: 0 }],
  [1480, focus(201, 610, 1.7, 540, 880)],
  [1522, focus(201, 614, 1.72, 540, 880), EASE.inOut],
  [1562, focus(201, 300, 1.75, 540, 880)],
  [1640, focus(201, 306, 1.8, 540, 880), EASE.inOut],
  [1692, { x: 540, y: 1080, s: 0.6, rx: 16, ry: 0, rz: 0, o: 0, dim: 0.4 }, EASE.in],
]);

const personScroll = (f: number) => 300 * progress(f, 792, 40, EASE.inOut) + 330 * progress(f, 858, 36, EASE.inOut);

const CHAPTERS: { at: number; out: number; kicker: string; lines: Line[]; sub?: string; size?: number }[] = [
  { at: 188, out: 404, kicker: "01 · Follow-ups", lines: ["Never forget", [{ text: "to " }, { text: "reach out.", accent: true }]] },
  { at: 428, out: 668, kicker: "02 · Quick capture", lines: ["Jot it down.", [{ text: "AI " }, { text: "files it.", accent: true }]] },
  { at: 702, out: 944, kicker: "03 · A card for everyone", lines: ["Everything you know,", [{ text: "in one place.", accent: true }]], size: 84 },
  { at: 972, out: 1150, kicker: "04 · Search", lines: ["Find anyone", [{ text: "in a " }, { text: "second.", accent: true }]] },
  { at: 1182, out: 1416, kicker: "05 · Globe", lines: ["Your people,", [{ text: "on a globe.", accent: true }]] },
  {
    at: 1450,
    out: 1640,
    kicker: "06 · AI assistant",
    lines: [[{ text: "Ask your " }, { text: "network.", accent: true }]],
    sub: "Your own key. Or ask from Claude, ChatGPT or Cursor via MCP.",
  },
];

/** The phone video (1080×1350, 30 s): see STORYBOARD.md → Pocket. */
export function Pocket() {
  const frame = useCurrentFrame();
  const pose = cam(frame);
  // Filters apply before the transform, so divide by the scale to get canvas pixels.
  const blur = Math.min(1.8, Math.max(0, (speed(cam, frame) - 6) * 0.045)) / pose.s;
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
      <PhoneRig pose={pose} blur={blur}>
        <PhoneContent frame={frame} personRef={personRef} personScroll={personScroll(frame)} />
      </PhoneRig>
      <GlobeBreakout cam={cam} />
      <CaptureLift cam={cam} />
      <Callouts cam={cam} anchors={anchors} scroll={personScroll} />
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(3,16,15,0.97) 0px, rgba(3,16,15,0.93) 330px, rgba(3,16,15,0.55) 420px, rgba(3,16,15,0) 530px)", opacity: frame < 1652 ? progress(frame, 70, 40, EASE.inOut) : 1 - progress(frame, 1652, 20) }} />
      <HookCopy />
      {CHAPTERS.map((c) =>
        frame >= c.at - 12 && frame <= c.out + 20 ? (
          <AbsoluteFill key={c.kicker} style={{ padding: "92px 80px" }}>
            <Headline at={c.at} out={c.out} kicker={c.kicker} lines={c.lines} sub={c.sub} size={c.size ?? 92} />
          </AbsoluteFill>
        ) : null,
      )}
      <Outro />
    </DarkStage>
  );
}

export { BASE };
