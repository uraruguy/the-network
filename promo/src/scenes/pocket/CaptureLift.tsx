import { useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { ArrowUp, Bell, Check, Link2, MapPin, NotebookPen, Sparkles, type LucideIcon } from "lucide-react";
import { EASE, SPRINGS, clamp01, mix, progress, springAt } from "../../kit/motion";
import { Spinner } from "../../ui/phone/ChatScreen";
import { Tap } from "../../ui/phone/parts";
import { B, LANDING } from "./beats";
import type { Anchors } from "./Callouts";
import { dof, project, type Pose } from "./camera";

const W = 370;
const SCALE = 2.3;
const TARGET = { x: 540 - (W * SCALE) / 2, y: 474 };
const CHIP_SCALE = 2.15;

type Phrase = { label: string; target: string; icon: LucideIcon; color: string; section: (typeof LANDING)[number] };
/** One chip per detected phrase, coloured like its marker; `section` is where it lands on Nik's card. */
const PHRASES: Phrase[] = [
  { label: "Note", target: "Nik Zupan", icon: NotebookPen, color: "var(--palette-violet)", section: "note" },
  { label: "Moving to", target: "Lisbon", icon: MapPin, color: "var(--palette-sky)", section: "moving" },
  { label: "Intro", target: "Valentina Dubois", icon: Link2, color: "var(--palette-rose)", section: "intro" },
  { label: "Follow-up", target: "in 2 weeks", icon: Bell, color: "var(--palette-amber)", section: "padel" },
];

/** The note, one clause per line (no orphans); `p` marks the phrase the AI picks out. */
const LINES: { t: string; p?: number }[][] = [
  [{ t: "Coffee with " }, { t: "Nik Zupan", p: 0 }, { t: "." }],
  [{ t: "Moving to " }, { t: "Lisbon", p: 1 }, { t: " in March," }],
  [{ t: "wants an intro to " }, { t: "Valentina", p: 2 }, { t: "." }],
  [{ t: "Padel rematch " }, { t: "in 2 weeks", p: 3 }, { t: "." }],
];
const WORDS = LINES.flat().reduce((n, s) => n + s.t.split(/\s+/).filter(Boolean).length, 0);

/**
 * Scene 2: the quick-capture field lifts out of the phone, the note appears word by word, sends,
 * and the AI marks the person, place, intro and date. Each mark launches its own chip into a
 * left-aligned stack (paths in line order, so they never cross). After a beat, the chips fly
 * into the sections of Nik's card they changed.
 */
export function CaptureLift({ cam, anchors }: { cam: (f: number) => Pose; anchors: Anchors }) {
  const frame = useCurrentFrame();
  const cardRef = useRef<HTMLDivElement>(null);
  const spans = useRef<(HTMLSpanElement | null)[]>([]);
  const [geo, setGeo] = useState<{ h: number; spans: { x: number; y: number }[] }>({ h: 150, spans: [] });

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    const next = { h: card.offsetHeight, spans: spans.current.map((el) => (el ? { x: el.offsetLeft, y: el.offsetTop + el.offsetHeight / 2 } : { x: 60, y: 40 })) };
    if (JSON.stringify(next) !== JSON.stringify(geo)) setGeo(next);
  });

  if (frame < B.lift - 4 || frame > B.toCard + 4 * B.toCardStep + B.toCardFlight + 4) return null;

  // Lift from the field's place in the phone to the canvas.
  const src = project(cam(Math.min(frame, B.lift + 30)), 16, 172);
  const lift = springAt(frame, B.lift, SPRINGS.smooth);
  // Mounts looking exactly like the phone's (dimmed, defocused) field, then comes into focus.
  const focusIn = progress(frame, B.lift - 4, 12, EASE.inOut);
  const pose0 = cam(frame);
  const look = 1 - focusIn;
  const s = mix(src.k, SCALE, lift);
  const x = mix(src.x, TARGET.x, lift);
  const y = mix(src.y, TARGET.y, lift);
  const cardOut = progress(frame, B.cardOut, 10, EASE.in);
  const shown = Math.floor(clamp01((frame - B.typeFrom) / (B.typeTo - B.typeFrom)) * WORDS + (frame >= B.typeFrom ? 1 : 0));
  const sendPress = frame >= B.send && frame < B.send + 10 ? 1 - Math.abs(frame - B.send - 5) / 5 : 0;
  const sent = frame >= B.send + 4;
  const working = sent && frame < B.highlight + 4;
  const filed = frame >= B.filed;
  const slotY = (i: number) => TARGET.y + geo.h * SCALE + 70 + i * 104;

  let word = 0;
  return (
    <AbsoluteFill>
      {/* the floating composer */}
      {cardOut < 1 && (
        <div style={{ position: "absolute", left: x, top: y - 70 * cardOut, width: W, transformOrigin: "0 0", transform: `scale(${s})`, opacity: 1 - cardOut, filter: look > 0.01 ? `brightness(${1 - pose0.dim * look}) blur(${(dof(frame) * look) / s}px)` : undefined }}>
          <div
            ref={cardRef}
            className="specular relative rounded-xl p-1.5 pl-3.5"
            style={{ background: "oklch(0.99 0.003 200 / 0.98)", boxShadow: `0 ${10 + 30 * lift}px ${30 + 60 * lift}px -12px rgba(0,0,0,${0.25 + 0.35 * lift}), inset 0 1px 0 rgba(255,255,255,0.9)` }}
          >
            <div className="flex items-end gap-2">
              <span className="grid h-9 shrink-0 place-items-center text-accent-text">
                <Sparkles size={18} strokeWidth={2.2} />
              </span>
              <div className="relative min-h-9 flex-1 self-center overflow-hidden py-[7px] text-body text-fg" style={{ height: 14 + 22 * mix(1, LINES.length, progress(frame, B.lift + 4, 18, EASE.inOut)) }}>
                {frame < B.typeFrom && <span className="absolute text-fg-4">Who did you meet? Jot it down…</span>}
                {LINES.map((line, li) => (
                    <div key={li}>
                      {line.map((seg, si) => {
                        const words = seg.t.split(/(\s+)/);
                        const body = words.map((w, wi) => {
                          if (!w.trim()) return w;
                          const n = word++;
                          return (
                            <span key={wi} style={{ opacity: frame >= B.typeFrom && n < shown ? 1 : 0 }}>
                              {w}
                            </span>
                          );
                        });
                        if (seg.p === undefined) return <span key={si}>{body}</span>;
                        return (
                          <span
                            key={si}
                            ref={(el) => {
                              spans.current[seg.p!] = el;
                            }}
                            style={marker(frame, seg.p, PHRASES[seg.p]!.color)}
                          >
                            {body}
                          </span>
                        );
                      })}
                    </div>
                  ))}
              </div>
              <span className={`grid size-9 shrink-0 place-items-center rounded-full ${frame >= B.typeFrom ? "specular bg-accent-fill text-accent-fg" : "bg-fill-2 text-fg-4"}`} style={{ transform: `scale(${1 - 0.12 * sendPress})` }}>
                {working ? <Spinner frame={frame} size={16} /> : <ArrowUp size={19} strokeWidth={2.6} />}
              </span>
            </div>
            <p className="flex h-7 items-center gap-2 px-0.5 pb-1 text-footnote text-fg-3" style={{ opacity: sent ? clamp01((frame - B.send - 4) / 5) : 0 }}>
              {filed ? (
                <>
                  <span className="grid size-4 place-items-center rounded-full bg-accent-fill text-accent-fg">
                    <Check size={11} strokeWidth={3.2} />
                  </span>
                  <span className="text-fg-2">Filed to Nik Zupan · 2 follow-ups</span>
                </>
              ) : (
                <>
                  <Spinner frame={frame} size={14} /> Working out who this is about…
                </>
              )}
            </p>
            <Tap x={W - 6 - 18} y={geo.h - 6 - 18 - 28} t={frame - B.send} hold={5} />
          </div>
        </div>
      )}

      {/* chips: word → stack → Nik's card */}
      {PHRASES.map((p, i) => {
        // Bottom phrase first: each later chip starts and lands above the earlier ones, so paths never cross.
        const start = B.chipLaunch + (PHRASES.length - 1 - i) * B.chipStep;
        if (frame < start) return null;
        const t = springAt(frame, start, SPRINGS.snappy);
        const sp = geo.spans[i] ?? { x: 60, y: 40 };
        const from = { x: TARGET.x + (sp.x + 36) * SCALE, y: TARGET.y + sp.y * SCALE };
        const slot = { x: TARGET.x + 6, y: slotY(i) };
        let cx = mix(from.x, slot.x, t);
        let cy = mix(from.y, slot.y, t);
        let sc = mix(0.6, CHIP_SCALE, t);
        let o = clamp01(t * 3);
        // Second flight: into the section of Nik's card it changed.
        const order = LANDING.indexOf(p.section);
        const go = B.toCard + order * B.toCardStep;
        const a = anchors[p.section];
        if (frame >= go && a) {
          const u = progress(frame, go, B.toCardFlight, EASE.inOut);
          const pose = cam(frame);
          const tp = project(pose, a.x + 12, a.y + a.h / 2);
          cx = mix(slot.x, tp.x, u) + Math.sin(u * Math.PI) * 40;
          cy = mix(slot.y, tp.y, u);
          sc = mix(CHIP_SCALE, tp.k * 0.95, u);
          o = 1 - clamp01((u - 0.7) / 0.3);
        }
        const land = springAt(frame, start + 14, SPRINGS.pop);
        const Icon = p.icon;
        return (
          <div key={p.label} style={{ position: "absolute", left: cx, top: cy, transformOrigin: "0 50%", transform: `translateY(-50%) scale(${sc})`, opacity: o }}>
            <div className="flex h-11 items-center gap-2.5 rounded-full pr-3 pl-1.5 whitespace-nowrap" style={{ background: "oklch(0.99 0.003 200 / 0.97)", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.55), inset 0 0 0 0.5px var(--hairline)" }}>
              <span className="grid size-8 place-items-center rounded-full" style={{ background: `color-mix(in oklab, ${p.color} 22%, transparent)`, color: `color-mix(in oklab, ${p.color} 70%, var(--fg))` }}>
                <Icon size={16} strokeWidth={2.3} />
              </span>
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

/** A marker stroke in the chip's colour, swept left → right. */
function marker(frame: number, i: number, color: string): React.CSSProperties {
  const t = progress(frame, B.highlight + i * 6, 10, EASE.out);
  return {
    backgroundImage: `linear-gradient(color-mix(in oklab, ${color} 34%, transparent), color-mix(in oklab, ${color} 34%, transparent))`,
    backgroundSize: `${t * 100}% 82%`,
    backgroundPosition: "0 60%",
    backgroundRepeat: "no-repeat",
    borderRadius: 4,
    fontWeight: t > 0.3 ? 600 : 400,
    boxDecorationBreak: "clone",
    WebkitBoxDecorationBreak: "clone",
  };
}
