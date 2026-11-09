import type { ReactNode } from "react";
import { ClipboardPaste, MapPin, Sparkles, UserPlus } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { Button, CATEGORY, Switch, ToggleChip, cn, Spinner } from "./parts";

/** The pasted note, as runs; `hl` runs are what the AI picks out. */
export type Run = { t: string; hl?: "person" | "place" | "date" };
export const NOTE: Run[][] = [
  [{ t: "Web Summit " }, { t: "Lisbon", hl: "place" }, { t: ", day 2 ☕" }],
  [{ t: "Met " }, { t: "Inês Sampaio", hl: "person" }, { t: ", product designer at Figma. Climbs on Thursdays." }],
  [{ t: "Mateo Fernández", hl: "person" }, { t: " is raising a seed round. Intro him to " }, { t: "Björn", hl: "person" }, { t: " at Index." }],
  [{ t: "Chloé Lefèvre", hl: "person" }, { t: " wants the article draft " }, { t: "next week", hl: "date" }, { t: "." }],
];
/** Number of highlighted runs (their order is the scan order). */
export const HL_COUNT = NOTE.flat().filter((r) => r.hl).length;

const HL_COLOR = {
  person: "var(--accent-soft)",
  place: "color-mix(in oklab, var(--palette-sky) 22%, transparent)",
  date: "color-mix(in oklab, var(--palette-amber) 28%, transparent)",
} as const;

type Proposal = { name: string; facts: string; city?: string; keyFacts: string; match?: string; cats: (keyof typeof CATEGORY)[]; followUp?: string };
export const PROPOSALS: Proposal[] = [
  { name: "Inês Sampaio", facts: "Product designer · Figma", city: "Lisbon", keyFacts: "Climbs on Thursdays · met at Web Summit", cats: ["friend"] },
  { name: "Mateo Fernández", facts: "Founder", city: "Lisbon", keyFacts: "Raising a seed round", match: "Mateo Fernández", cats: ["founder"] },
  { name: "Björn Østergaard", facts: "Partner · Index Ventures", city: "Copenhagen", keyFacts: "Intro to Mateo", match: "Björn Østergaard", cats: ["investor"] },
  { name: "Chloé Lefèvre", facts: "Journalist", city: "Paris", keyFacts: "Wants the article draft", match: "Chloé Lefèvre", cats: ["acquaint"], followUp: "Send Chloé the article draft · next week" },
];

function NoteText({ scan, hl }: { scan: number; hl: number[] }) {
  let k = 0;
  return (
    <div className="text-body whitespace-pre-wrap text-fg">
      {NOTE.map((line, li) => (
        <div key={li} style={{ minHeight: 22, marginBottom: li === 0 ? 6 : 2 }}>
          {line.map((r, ri) => {
            if (!r.hl) return <span key={ri}>{r.t}</span>;
            const p = hl[k++] ?? 0;
            return (
              <span key={ri} className="relative rounded-[5px]" style={{ padding: "1px 2px", margin: "0 -2px", fontWeight: p > 0.5 ? 600 : undefined }}>
                <span
                  className="absolute inset-0 rounded-[5px]"
                  style={{ background: HL_COLOR[r.hl], transformOrigin: "left center", transform: `scaleX(${p})`, boxShadow: p > 0.9 ? `inset 0 -2px 0 color-mix(in oklab, ${r.hl === "person" ? "var(--accent)" : r.hl === "place" ? "var(--palette-sky)" : "var(--palette-amber)"} 70%, transparent)` : undefined }}
                />
                <span className="relative">{r.t}</span>
              </span>
            );
          })}
        </div>
      ))}
      {scan > 0 && scan < 1 && (
        <div
          className="pointer-events-none absolute inset-x-0"
          style={{ top: `${scan * 100}%`, height: 46, marginTop: -23, background: "linear-gradient(to bottom, transparent, color-mix(in oklab, var(--accent) 16%, transparent), transparent)" }}
        />
      )}
    </div>
  );
}

function PersonCard({ p, appear }: { p: Proposal; appear: number }) {
  return (
    <article className="surface rounded-lg p-3.5" style={{ opacity: appear, transform: `translateY(${(1 - appear) * 22}px) scale(${0.97 + 0.03 * appear})` }}>
      <div className="flex items-start gap-3">
        <Avatar name={p.name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-headline text-fg">{p.name}</div>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-footnote text-fg-3">
            <span>{p.facts}</span>
            {p.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={12} strokeWidth={2.2} /> {p.city}
              </span>
            )}
          </p>
          <p className="mt-1 text-footnote text-fg-2">{p.keyFacts}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <ToggleChip size="sm" pressed={!p.match} icon={<UserPlus />}>
          New person
        </ToggleChip>
        {p.match && (
          <ToggleChip size="sm" pressed>
            = {p.match}
          </ToggleChip>
        )}
        <ToggleChip size="sm">Someone else…</ToggleChip>
        <ToggleChip size="sm">Skip</ToggleChip>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(Object.keys(CATEGORY) as (keyof typeof CATEGORY)[]).map((slug) => (
          <ToggleChip key={slug} size="sm" color={CATEGORY[slug].color} pressed={p.cats.includes(slug)}>
            {CATEGORY[slug].name}
          </ToggleChip>
        ))}
      </div>
      {p.followUp && (
        <div className="mt-2 flex min-h-11 items-center justify-between gap-4">
          <span className="min-w-0">
            <span className="block text-body text-fg">Create follow-up</span>
            <span className="mt-0.5 block text-footnote text-fg-3">{p.followUp}</span>
          </span>
          <Switch on={1} />
        </div>
      )}
    </article>
  );
}

export type ImportState = {
  /** 0..1 open animation */
  open: number;
  step: "paste" | "reading" | "review";
  /** 0..1 how much of the note is on screen (the paste drops it in at once). */
  pasted: number;
  /** Scan line 0..1 and per-highlight progress. */
  scan: number;
  hl: number[];
  /** Review: cards appear (0..1 each), body scroll, Save press. */
  cards: number[];
  scroll: number;
  savePress: number;
  frame: number;
  /** Cross-fade between paste/reading content and review (0 = paste, 1 = review). */
  morph: number;
};

/** QuickImportSheet as the desktop dialog: 600 wide, tall, glass-thick, over a dimmed window. */
export function ImportSheet({ s }: { s: ImportState }) {
  const footer: ReactNode =
    s.morph < 0.5 ? (
      <div className="flex items-center gap-2">
        <Button variant="ghost">
          <ClipboardPaste size={18} /> Paste from clipboard
        </Button>
        <span className="ml-auto">
          <Button variant="primary" className={cn(s.pasted < 1 && "opacity-45")}>
            {s.step === "reading" ? <Spinner size={18} frame={s.frame} /> : <Sparkles size={18} />} Find people
          </Button>
        </span>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <Button variant="ghost">Edit text</Button>
        <span className="ml-auto" style={{ transform: `scale(${1 - 0.05 * s.savePress})` }}>
          <Button variant="primary">Save note · 4 people</Button>
        </span>
      </div>
    );
  return (
    <div className="absolute inset-0 z-50" style={{ top: 0 }}>
      <div className="absolute inset-0" style={{ background: "var(--backdrop)", opacity: s.open }} />
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
          <div className="relative min-h-0 flex-1 overflow-hidden px-5 pb-5">
            {s.morph < 1 && (
              <div className="space-y-3 pt-1" style={{ opacity: 1 - s.morph, transform: `translateY(${-s.morph * 16}px)` }}>
                <p className="text-subhead text-fg-2">Claude finds the people in it. You confirm who’s who before anything is saved.</p>
                <div className="space-y-1.5">
                  <span className="block px-1 text-footnote font-medium text-fg-2">Note</span>
                  <div
                    className="relative min-h-56 w-full overflow-hidden rounded-sm border-[0.5px] bg-surface-2 px-4 py-3 shadow-e1"
                    style={{ borderColor: s.pasted > 0 ? "var(--accent)" : "var(--hairline)", boxShadow: s.pasted > 0 ? "0 0 0 3px var(--focus-ring)" : undefined, height: 236 }}
                  >
                    {s.pasted <= 0 ? (
                      <span className="text-body text-fg-4">Coffee with Ana — she’s moving to Lisbon, wants an intro to…</span>
                    ) : (
                      <div style={{ opacity: Math.min(1, s.pasted * 1.4), transform: `translateY(${(1 - s.pasted) * 8}px)` }}>
                        <NoteText scan={s.scan} hl={s.hl} />
                      </div>
                    )}
                    {s.pasted > 0 && s.pasted < 1 && <div className="absolute inset-0" style={{ background: "var(--accent-soft)", opacity: 1 - s.pasted }} />}
                  </div>
                </div>
                {s.step === "reading" ? (
                  <p className="flex items-center gap-2 text-subhead text-fg-2">
                    <Spinner size={16} frame={s.frame} /> Reading the note…
                  </p>
                ) : (
                  <p className="text-footnote text-fg-3">The text is sent to the AI provider to extract people; nothing is stored until you save.</p>
                )}
              </div>
            )}
            {s.morph > 0 && (
              <div className="absolute inset-x-5 top-0 space-y-4 pt-1" style={{ opacity: s.morph, transform: `translateY(${(1 - s.morph) * 18 - s.scroll}px)` }}>
                <div className="space-y-1.5">
                  <span className="block px-1 text-footnote font-medium text-fg-2">Title</span>
                  <div className="flex h-11 w-full items-center rounded-sm border-[0.5px] border-hairline bg-surface-2 px-4 text-body text-fg shadow-e1">Web Summit Lisbon, day 2</div>
                </div>
                <div className="space-y-1.5">
                  <p className="px-1 text-footnote font-medium text-fg-2">File the note under</p>
                  <div className="flex flex-wrap gap-1.5">
                    {PROPOSALS.map((p, i) => (
                      <ToggleChip key={p.name} pressed={i === 0} icon={i === 0 ? <CheckIcon /> : undefined}>
                        {p.name}
                      </ToggleChip>
                    ))}
                  </div>
                </div>
                <ul className="space-y-3">
                  {PROPOSALS.map((p, i) => (
                    <li key={p.name}>
                      <PersonCard p={p} appear={s.cards[i] ?? 0} />
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div className="shrink-0 border-t-[0.5px] border-separator px-5 pt-3 pb-4">{footer}</div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

/** Window-space anchors (dialog centred in the 1440×900 viewport under the 38 pt title bar). */
export const IMPORT = {
  left: 420,
  top: 38 + 67,
  /** Footer primary button centre. */
  primary: { x: 420 + 600 - 20 - 75, y: 38 + 67 + 765 - 16 - 22 },
  textCenter: { x: 720, y: 38 + 67 + 200 },
};
