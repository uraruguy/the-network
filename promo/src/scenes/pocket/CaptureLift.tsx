import { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ArrowUp, Bell, Check, Link2, MapPin, NotebookPen, Sparkles } from "lucide-react";
import { CAPTURE } from "../../data/demo";
import { Avatar } from "../../kit/Avatar";
import { EASE, SPRINGS, clamp01, mix, progress, springAt } from "../../kit/motion";
import { Caret, Tap } from "../../ui/phone/parts";
import { Spinner } from "../../ui/phone/ChatScreen";
import { project, type Pose } from "./camera";

const W = 370;
const SCALE = 2.3;
const TARGET = { x: 540 - (W * SCALE) / 2, y: 440 };
const TYPE_AT = 456;
const TYPE_END = 552;
const SEND_AT = 560;

/** The phrases the AI picks out, in the order they light up, and what each one files. */
const PHRASES = [
  { text: "Nik Zupan", icon: NotebookPen, label: "Note", target: "Nik Zupan", person: true },
  { text: "Lisbon", icon: MapPin, label: "Moving to", target: "Lisbon" },
  { text: "in 2 weeks", icon: Bell, label: "Follow-up", target: "in 2 weeks" },
  { text: "Valentina", icon: Link2, label: "Intro", target: "Valentina Dubois", person: true },
] as const;
const HL_AT = 584;
const HL_STEP = 7;
const CHIP_AT = 596;
const CHIP_STEP = 8;

/** Splits the typed text into plain runs and phrase spans (only phrases fully typed are spans). */
function segments(text: string) {
  const out: { s: string; i?: number }[] = [];
  let rest = text;
  let guard = 0;
  while (rest && guard++ < 20) {
    let best = -1;
    let at = Infinity;
    PHRASES.forEach((p, i) => {
      const j = rest.indexOf(p.text);
      if (j >= 0 && j < at) {
        at = j;
        best = i;
      }
    });
    if (best < 0) {
      out.push({ s: rest });
      break;
    }
    if (at > 0) out.push({ s: rest.slice(0, at) });
    out.push({ s: PHRASES[best]!.text, i: best });
    rest = rest.slice(at + PHRASES[best]!.text.length);
  }
  return out;
}

/**
 * Scene 2: the quick-capture field lifts out of the (dimmed) phone as a big floating card, you
 * type who you met, send, and the AI picks out the people, place and date and files them.
 */
export function CaptureLift({ cam }: { cam: (f: number) => Pose }) {
  const frame = useCurrentFrame();
  const cardRef = useRef<HTMLDivElement>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const [geo, setGeo] = useState<{ h: number; spans: { x: number; y: number; w: number }[] }>({ h: 120, spans: [] });

  const typedLen = Math.max(0, Math.min(CAPTURE.text.length, Math.floor(((frame - TYPE_AT) / (TYPE_END - TYPE_AT)) * CAPTURE.text.length)));
  const text = CAPTURE.text.slice(0, typedLen);

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const next = {
      h: card.offsetHeight,
      spans: spans.current.map((el) => (el ? { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2, w: el.offsetWidth } : { x: W / 2, y: 40, w: 0 })),
    };
    if (next.h !== geo.h || JSON.stringify(next.spans) !== JSON.stringify(geo.spans)) setGeo(next);
  });

  if (frame < 420 || frame > 700) return null;

  // Lift: from the field's place inside the phone to the middle of the canvas.
  const pose = cam(Math.min(frame, 470));
  const src = project(pose, 16, 172);
  const lift = springAt(frame, 424, SPRINGS.smooth);
  const s = mix(src.k, SCALE, lift);
  const x = mix(src.x, TARGET.x, lift);
  const y = mix(src.y, TARGET.y, lift);
  const exit = progress(frame, 674, 18, EASE.in);
  const sendPress = frame >= SEND_AT && frame < SEND_AT + 10 ? 1 - Math.abs(frame - SEND_AT - 5) / 5 : 0;
  const sent = frame >= SEND_AT + 6;
  const working = sent && frame < HL_AT + 6;
  const filed = frame >= CHIP_AT + PHRASES.length * CHIP_STEP + 10;

  return (
    <AbsoluteFill style={{ opacity: 1 - exit, filter: exit > 0 ? `blur(${exit * 6}px)` : undefined, transformOrigin: "300px 860px", transform: `scale(${1 - 0.72 * exit})` }}>
      {/* the floating composer */}
      <div style={{ position: "absolute", left: x, top: y, width: W, transformOrigin: "0 0", transform: `scale(${s})` }}>
        <div
          ref={cardRef}
          className="specular relative rounded-xl p-1.5 pl-3.5"
          style={{
            background: "oklch(0.99 0.003 200 / 0.97)",
            boxShadow: `0 ${10 + 30 * lift}px ${30 + 60 * lift}px -12px rgba(0,0,0,${0.25 + 0.3 * lift}), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 ${lift * 1}px rgba(95,240,244,${0.25 * lift})`,
          }}
        >
          <div className="flex items-end gap-2">
            <span className="grid h-9 shrink-0 place-items-center text-accent-text">
              <Sparkles size={18} strokeWidth={2.2} />
            </span>
            <div className="min-h-9 flex-1 self-center py-[7px] text-body text-fg">
              {text ? (
                segments(text).map((seg, k) =>
                  seg.i === undefined ? (
                    <span key={k}>{seg.s}</span>
                  ) : (
                    <span
                      key={k}
                      ref={(el) => {
                        spans.current[seg.i!] = el;
                      }}
                      style={highlight(frame, seg.i)}
                    >
                      {seg.s}
                    </span>
                  ),
                )
              ) : (
                <span className="text-fg-4">Who did you meet? Jot it down…</span>
              )}
              {frame >= TYPE_AT - 8 && !sent && <Caret frame={frame} />}
            </div>
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-full ${text ? "specular bg-accent-fill text-accent-fg" : "bg-fill-2 text-fg-4"}`}
              style={{ transform: `scale(${1 - 0.12 * sendPress})` }}
            >
              {working ? <Spinner frame={frame} size={16} /> : <ArrowUp size={19} strokeWidth={2.6} />}
            </span>
          </div>
          {sent && (
            <p className="flex items-center gap-2 px-0.5 pt-1 pb-1.5 text-footnote text-fg-3" style={{ opacity: clamp01((frame - SEND_AT - 6) / 6) }}>
              {filed ? (
                <>
                  <span className="grid size-4 place-items-center rounded-full bg-accent-fill text-accent-fg">
                    <Check size={11} strokeWidth={3.2} />
                  </span>
                  <span className="text-fg-2">Filed under 2 people · 1 follow-up</span>
                </>
              ) : (
                <>
                  <Spinner frame={frame} size={14} /> Working out who this is about…
                </>
              )}
            </p>
          )}
          <Tap x={W - 6 - 18 - 14} y={geo.h - 6 - 18 - (sent ? 30 : 0)} t={frame - SEND_AT} hold={6} />
        </div>
      </div>

      {/* filed chips fly out of the phrases */}
      {PHRASES.map((p, i) => {
        const start = CHIP_AT + i * CHIP_STEP;
        const t = springAt(frame, start, SPRINGS.snappy);
        if (frame < start) return null;
        const sp = geo.spans[i] ?? { x: W / 2, y: 40, w: 0 };
        const from = { x: TARGET.x + sp.x * SCALE, y: TARGET.y + sp.y * SCALE };
        const to = { x: 540, y: TARGET.y + geo.h * SCALE + 84 + i * 108 };
        const cx = mix(from.x, to.x, t);
        const cy = mix(from.y, to.y, t) - Math.sin(Math.min(1, t) * Math.PI) * 50;
        const land = springAt(frame, start + 14, SPRINGS.pop);
        const Icon = p.icon;
        return (
          <div
            key={p.label}
            style={{
              position: "absolute",
              left: cx,
              top: cy,
              transform: `translate(-50%, -50%) scale(${mix(0.35, 2.25, t)})`,
              opacity: clamp01(t * 3),
            }}
          >
            <div className="surface flex h-11 items-center gap-2.5 rounded-full pr-3 pl-1.5 whitespace-nowrap" style={{ background: "oklch(0.99 0.003 200 / 0.96)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.5)" }}>
              {"person" in p && p.person ? (
                <Avatar name={p.target} size={32} />
              ) : (
                <span className="grid size-8 place-items-center rounded-full bg-accent-soft text-accent-text">
                  <Icon size={16} strokeWidth={2.2} />
                </span>
              )}
              <span className="text-footnote font-medium text-fg-3">{p.label}</span>
              <span className="text-footnote text-fg-4">→</span>
              <span className="text-headline text-fg">{p.target}</span>
              <span className="grid size-[22px] place-items-center rounded-full bg-accent-fill text-accent-fg" style={{ transform: `scale(${land})`, opacity: clamp01(land * 2) }}>
                <Check size={13} strokeWidth={3.2} />
              </span>
            </div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
}

function highlight(frame: number, i: number): React.CSSProperties {
  const t = progress(frame, HL_AT + i * HL_STEP, 12, EASE.out);
  return {
    backgroundImage: "linear-gradient(var(--accent-soft), var(--accent-soft))",
    backgroundSize: `${t * 100}% 100%`,
    backgroundRepeat: "no-repeat",
    borderRadius: 4,
    fontWeight: t > 0.3 ? 600 : 400,
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
    padding: "0 1px",
    margin: "0 -1px",
  };
}
