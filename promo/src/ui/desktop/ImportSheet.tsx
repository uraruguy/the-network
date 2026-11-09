import { useLayoutEffect, useRef, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { Bell, ClipboardPaste, MapPin, Sparkles, UserPlus } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { Button, CATEGORY, Spinner, ToggleChip } from "./parts";

/** The pasted note, as runs; `hl` runs are what the AI picks out (`p` = index of the person). */
export type Run = { t: string; hl?: "person" | "place" | "date"; p?: number };
export const NOTE: Run[][] = [
  [{ t: "Web Summit " }, { t: "Lisbon", hl: "place" }, { t: ", day 2 ☕" }],
  [{ t: "Met " }, { t: "Inês Sampaio", hl: "person", p: 0 }, { t: ", product designer at Figma." }],
  [{ t: "Climbs on Thursdays." }],
  [{ t: "Mateo Fernández", hl: "person", p: 1 }, { t: " is raising a seed round." }],
  [{ t: "Intro him to " }, { t: "Björn", hl: "person", p: 2 }, { t: " at Index." }],
  [{ t: "Chloé Lefèvre", hl: "person", p: 3 }, { t: " wants the draft " }, { t: "next week", hl: "date" }, { t: "." }],
];
export const HL_COUNT = NOTE.flat().filter((r) => r.hl).length;

const HL_COLOR = {
  person: "color-mix(in oklab, var(--accent) 26%, transparent)",
  place: "color-mix(in oklab, var(--palette-sky) 30%, transparent)",
  date: "color-mix(in oklab, var(--palette-amber) 38%, transparent)",
} as const;
const HL_TEXT = { person: "var(--accent-strong)", place: "color-mix(in oklab, var(--palette-sky) 70%, var(--fg))", date: "color-mix(in oklab, var(--palette-amber) 55%, var(--fg))" } as const;

type Proposal = { name: string; facts: string; city?: string; match?: boolean; followUp?: string; cat: keyof typeof CATEGORY };
export const PROPOSALS: Proposal[] = [
  { name: "Inês Sampaio", facts: "Product designer", city: "Lisbon", cat: "friend" },
  { name: "Mateo Fernández", facts: "Founder", city: "Lisbon", match: true, cat: "founder" },
  { name: "Björn Østergaard", facts: "Partner · Index Ventures", match: true, cat: "investor" },
  { name: "Chloé Lefèvre", facts: "Journalist", city: "Paris", match: true, followUp: "next week", cat: "acquaint" },
];

export type ImportState = {
  open: number;
  /** Per highlighted run (scan order), 0..1. */
  hl: number[];
  reading: boolean;
  /** Per person: the name chip's flight from the text to its card (0..1). */
  lift: number[];
  /** The note text fades out (0..1) before the cards fade in (so there's no double exposure). */
  text: number;
  /** Cards fade in (0..1). */
  cards: number;
  savePress: number;
  /** Per person: the avatar's flight from its card into the People tile (0..1). */
  file: number[];
  frame: number;
};

type Box = { x: number; y: number; w: number; h: number };
type Measure = { spans: Box[]; names: Box[]; avatars: Box[] };

/** Layout offset of `el` inside `root` (transform-agnostic: offsetLeft/Top chain). */
function offsetIn(el: HTMLElement, root: HTMLElement): Box {
  let x = 0;
  let y = 0;
  let n: HTMLElement | null = el;
  while (n && n !== root) {
    x += n.offsetLeft;
    y += n.offsetTop;
    n = n.offsetParent as HTMLElement | null;
  }
  return { x, y, w: el.offsetWidth, h: el.offsetHeight };
}

const arc = (a: Box, b: Box, t: number, lift = 70) => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t - Math.sin(Math.PI * t) * lift });
const tween01 = (t: number, a: number, b: number) => Math.min(1, Math.max(0, (t - a) / (b - a)));
/** Quadratic Bézier from a to b through control point c. */
const via = (a: Box, c: { x: number; y: number }, b: Box, t: number) => {
  const u = 1 - t;
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y };
};

/** Content-area position of the People tile's number (Today: main 106, 277). */
const TILE = { x: 236 + 106, y: 277 - 10 };

/**
 * QuickImportSheet as the desktop dialog (600 wide, glass-thick) over a white, blurred window.
 * It opens with the note already pasted; the AI pass highlights it; the people's names lift out
 * of the text into their proposal cards; Save files them (avatars fly into the People tile).
 */
export function ImportSheet({ s }: { s: ImportState }) {
  const root = useRef<HTMLDivElement>(null);
  const [m, setM] = useState<Measure | null>(null);
  const [handle] = useState(() => delayRender("measure import sheet"));
  useLayoutEffect(() => {
    let live = true;
    document.fonts.ready.then(() => {
      const r = root.current;
      if (!live || !r) return;
      const all = (sel: string) => Array.from(r.querySelectorAll<HTMLElement>(sel)).map((el) => offsetIn(el, r));
      setM({ spans: all("[data-person-span]"), names: all("[data-card-name]"), avatars: all("[data-card-avatar]") });
      continueRender(handle);
    });
    return () => {
      live = false;
    };
  }, [handle]);

  const closing = s.file.some((f) => f > 0);
  let k = 0;
  return (
    <div ref={root} className="absolute inset-0 z-50">
      <div className="absolute inset-0" style={{ background: "color-mix(in oklab, var(--bg) 55%, transparent)", backdropFilter: "blur(8px) saturate(1.2)", WebkitBackdropFilter: "blur(8px) saturate(1.2)", opacity: s.open }} />
      <div className="absolute inset-0 grid place-items-center" style={{ padding: "24px 16px" }}>
        <div
          className="glass-thick specular elevation-e4 relative flex flex-col overflow-hidden text-fg"
          style={{ width: 600, height: 765, borderRadius: 28, opacity: Math.min(1, s.open * 1.5), transform: `translateY(${(1 - s.open) * 10}px) scale(${0.96 + 0.04 * s.open})` }}
        >
          <div className="relative shrink-0 px-3 pt-3 pb-1">
            <div className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
              <span className="inline-flex h-11 items-center justify-self-start rounded-full px-2 text-body text-accent-text">Cancel</span>
              <span className="text-center text-headline text-fg">Paste a note</span>
              <span />
            </div>
          </div>
          <div className="relative min-h-0 flex-1 px-5 pb-5">
            <div className="space-y-3 pt-1" style={{ opacity: 1 - s.text }}>
              <p className="text-subhead text-fg-2">Claude finds the people in it. You confirm who’s who before anything is saved.</p>
              <div className="space-y-1.5">
                <span className="block px-1 text-footnote font-medium text-fg-2">Note</span>
                <div className="relative w-full rounded-sm border-[0.5px] bg-surface-2 px-4 py-3 shadow-e1" style={{ borderColor: "var(--accent)", boxShadow: "0 0 0 3px var(--focus-ring)", height: 236 }}>
                  <div className="text-body text-fg">
                    {NOTE.map((line, li) => (
                      <div key={li} style={{ minHeight: 22, marginBottom: li === 0 ? 6 : 2 }}>
                        {line.map((r, ri) => {
                          if (!r.hl) return <span key={ri}>{r.t}</span>;
                          const p = s.hl[k++] ?? 0;
                          const gone = r.p !== undefined && (s.lift[r.p] ?? 0) > 0.02;
                          return (
                            <span
                              key={ri}
                              data-person-span={r.p !== undefined ? "" : undefined}
                              className="relative rounded-[5px]"
                              style={{ padding: "1px 2px", margin: "0 -2px", fontWeight: p > 0.5 ? 600 : undefined, color: p > 0.5 ? HL_TEXT[r.hl] : undefined, opacity: gone ? 0.25 : 1 }}
                            >
                              <span className="absolute inset-0 rounded-[5px]" style={{ background: HL_COLOR[r.hl], transformOrigin: "left center", transform: `scaleX(${p})` }} />
                              <span className="relative">{r.t}</span>
                            </span>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <p className="flex h-5 items-center gap-2 text-subhead text-fg-2">
                {s.reading && (
                  <>
                    <Spinner size={16} frame={s.frame} /> Reading the note…
                  </>
                )}
              </p>
            </div>
            <div className="absolute inset-x-5 top-1" style={{ opacity: s.cards }}>
              <div className="space-y-1.5 pb-3">
                <p className="px-1 text-footnote font-medium text-fg-2">File the note under</p>
                <div className="flex flex-wrap gap-1.5">
                  {PROPOSALS.map((p, i) => (
                    <ToggleChip key={p.name} pressed={i === 0}>
                      {p.name}
                    </ToggleChip>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                {PROPOSALS.map((p, i) => (
                  <article key={p.name} className="surface rounded-lg p-3" style={{ opacity: closing ? 1 - (s.file[i] ?? 0) * 0.6 : 1 }}>
                    <div className="flex items-start gap-2.5">
                      <span data-card-avatar="" style={{ opacity: (s.file[i] ?? 0) > 0.01 ? 0.15 : 1 }}>
                        <Avatar name={p.name} size={36} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div data-card-name="" className="inline-block truncate text-headline text-fg" style={{ opacity: (s.lift[i] ?? 0) >= 1 ? 1 : 0 }}>
                          {p.name}
                        </div>
                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-footnote text-fg-3">
                          {p.facts}
                          {p.city && (
                            <span className="inline-flex items-center gap-0.5">
                              <MapPin size={11} strokeWidth={2.2} /> {p.city}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {p.match ? (
                        <ToggleChip size="sm" pressed>
                          = {p.name.split(" ")[0]}
                        </ToggleChip>
                      ) : (
                        <ToggleChip size="sm" pressed icon={<UserPlus />}>
                          New person
                        </ToggleChip>
                      )}
                      {p.followUp && (
                        <ToggleChip size="sm" icon={<Bell />}>
                          Follow-up · {p.followUp}
                        </ToggleChip>
                      )}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(["friend", "founder", "investor", "acquaint"] as const).map((c) => (
                        <ToggleChip key={c} size="sm" color={CATEGORY[c].color} pressed={p.cat === c}>
                          {CATEGORY[c].name}
                        </ToggleChip>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
          <div className="shrink-0 border-t-[0.5px] border-separator px-5 pt-3 pb-4">
            {s.cards < 0.5 ? (
              <div className="flex items-center gap-2">
                <Button variant="ghost">
                  <ClipboardPaste size={18} /> Paste from clipboard
                </Button>
                <span className="ml-auto">
                  <Button variant="primary">{s.reading ? <Spinner size={18} frame={s.frame} /> : <Sparkles size={18} />} Find people</Button>
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost">Edit text</Button>
                <span className="ml-auto" style={{ transform: `scale(${1 - 0.06 * s.savePress})` }}>
                  <Button variant="primary">Save note · 4 people</Button>
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      {m &&
        PROPOSALS.map((p, i) => {
          const t = s.lift[i] ?? 0;
          const span = m.spans[i];
          const b = m.names[i];
          if (!span || !b || t <= 0 || t >= 1) return null;
          // The span's text sits inside 2 px / 1 px padding.
          const a = { ...span, x: span.x + 2, y: span.y + 1 };
          // Lower-row cards are reached through the gutters (between the columns, then the rows),
          // so no name flies across another card.
          const col1 = m.avatars[1];
          const row1 = m.avatars[2];
          const gutter = col1 && row1 ? { x: col1.x - 14, y: row1.y - 14 } : { x: b.x, y: b.y };
          const at = i === 0 ? arc(a, b, t, 40) : i === 1 ? via(a, { x: gutter.x, y: a.y }, b, t) : via(a, gutter, b, t);
          const bump = Math.sin(Math.PI * t);
          // A lifted token while in the air (opaque, so it never smears over card text); it melts
          // into the card's own title in the last frames, at the exact same position and type.
          const pill = 1 - tween01(t, 0.72, 1);
          return (
            <span
              key={`lift-${p.name}`}
              className="absolute text-headline whitespace-nowrap"
              style={{
                left: at.x - 8,
                top: at.y - 4,
                padding: "4px 8px",
                borderRadius: 10,
                background: `color-mix(in oklab, var(--surface-solid) ${pill * 100}%, transparent)`,
                boxShadow: `0 ${10 * bump}px ${26 * bump}px -8px rgba(0,60,70,${0.45 * pill}), 0 0 0 ${pill}px var(--hairline)`,
                color: t > 0.5 ? "var(--fg)" : "var(--accent-strong)",
                transformOrigin: "8px 50%",
                transform: `scale(${1 + bump * 0.16})`,
                zIndex: 60,
              }}
            >
              {p.name}
            </span>
          );
        })}
      {m &&
        PROPOSALS.map((p, i) => {
          const t = s.file[i] ?? 0;
          const a = m.avatars[i];
          if (!a || t <= 0 || t >= 1) return null;
          const at = arc(a, { ...TILE, w: 36, h: 36 }, t, 140);
          return (
            <span key={`file-${p.name}`} className="absolute" style={{ left: at.x, top: at.y, transform: `scale(${1 - 0.45 * t})`, opacity: t > 0.9 ? (1 - t) * 10 : 1, zIndex: 60, filter: "drop-shadow(0 8px 14px rgba(0,60,70,0.3))" }}>
              <Avatar name={p.name} size={36} />
            </span>
          );
        })}
    </div>
  );
}

/** Window-space centre of the footer's primary button (dialog centred in the 1440×900 viewport, under the 38 pt title bar). */
export const IMPORT = { primary: { x: 420 + 600 - 20 - 75, y: 38 + 67 + 765 - 16 - 22 } };
