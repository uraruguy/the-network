import { ArrowUpDown, CheckCircle2, Globe2, Plus } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { PEOPLE, type Person } from "../../data/demo";
import { Button, FilterPill, SearchField, WARMTH_COLOR, cn } from "./parts";

/** The Lisbon people the search lands on (from the import + the globe data). */
export const LISBON: Person[] = [
  { name: "Inês Sampaio", city: "Lisbon", flag: "🇵🇹", role: "Product designer", company: "Figma", warmth: "inner", last: "now", acts: ["🧗", "☕"] },
  { name: "Mateo Fernández", city: "Lisbon", flag: "🇵🇹", role: "Founder", warmth: "active", last: "now", acts: ["🧗", "🎾"] },
  { name: "Valentina Dubois", city: "Lisbon", flag: "🇵🇹", role: "Designer", warmth: "active", last: "3w", acts: ["🧗", "🍽️", "✈️"] },
];

/** The list before searching: the README screenshot's rows, with the Lisbon three woven in. */
export const ROWS: Person[] = [...PEOPLE.slice(0, 6), LISBON[0]!, ...PEOPLE.slice(6, 9), LISBON[1]!, PEOPLE[9]!, LISBON[2]!, ...PEOPLE.slice(10)];

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
export const matches = (p: Person, q: string) => !q || norm([p.name, p.city, p.role, p.company].filter(Boolean).join(" ")).includes(norm(q));

function Row({ p, collapse, highlight, hover }: { p: Person; collapse: number; highlight: string; hover?: number }) {
  const work = [p.role, p.company].filter(Boolean).join(", ");
  const city = p.city ? `${p.flag ?? ""} ${p.city}`.trim() : "";
  const sub = [city, work].filter(Boolean).join(" · ");
  return (
    <div className="relative overflow-hidden" style={{ height: 68 * (1 - collapse), opacity: 1 - collapse * 1.3 }}>
      <div
        className="relative flex h-[68px] w-full items-center gap-3 px-4 after:absolute after:right-0 after:bottom-0 after:left-[72px] after:h-[0.5px] after:bg-separator"
        style={{ background: hover ? `color-mix(in oklab, var(--fill-1) ${hover * 100}%, transparent)` : undefined }}
      >
        <Avatar name={p.name} size={44} />
        <span className="flex min-w-0 flex-1 flex-col justify-center">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-headline text-fg">
              <Marked text={p.name} q={highlight} />
            </span>
            <span className="size-2 shrink-0 rounded-full" style={{ background: WARMTH_COLOR[p.warmth] }} />
          </span>
          {sub && (
            <span className="mt-0.5 truncate text-footnote text-fg-2">
              <Marked text={sub} q={highlight} />
            </span>
          )}
        </span>
        <span className="flex shrink-0 flex-col items-end justify-center gap-1 self-stretch pl-1">
          <span className="text-footnote text-fg-3 tabular-nums">{p.last ?? ""}</span>
          {p.acts && <span className="text-footnote leading-none tracking-[0.08em]">{p.acts.slice(0, 3).join("")}</span>}
        </span>
      </div>
    </div>
  );
}

/** Highlights the (accent-insensitive) match of `q` inside `text`. */
function Marked({ text, q }: { text: string; q: string }) {
  if (!q) return <>{text}</>;
  const i = norm(text).indexOf(norm(q));
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-[4px] bg-accent-soft px-px text-accent-text" style={{ color: "inherit", boxShadow: "inset 0 -2px 0 var(--accent)" }}>
        {text.slice(i, i + q.length)}
      </mark>
      {text.slice(i + q.length)}
    </>
  );
}

/**
 * Desktop People (PeopleList): large title + counts, Select / Show on globe / New person, the
 * search field, sort + facet pills, the list. `query` types live; `filter` (0..1) folds the rows
 * that don't match.
 */
export function PeoplePage({
  query,
  caret,
  focused,
  filter,
  collapse,
  hoverRow,
}: {
  query: string;
  caret?: boolean;
  focused?: boolean;
  filter: number;
  /** Per-row fold (0..1); defaults to folding non-matches by `filter`. */
  collapse?: Record<string, number>;
  hoverRow?: { name: string; v: number };
}) {
  const fold = (p: Person) => collapse?.[p.name] ?? (matches(p, query) ? 0 : filter);
  const shown = ROWS.filter((p) => fold(p) < 0.5);
  const filtering = query.length > 0;
  return (
    <div className="mx-auto w-full" style={{ maxWidth: 1100, padding: "32px 40px 32px" }}>
      <header className="flex items-end justify-between gap-3 pb-3">
        <div className="min-w-0">
          <h1 className="text-large-title text-fg">People</h1>
          <p className="mt-0.5 min-h-5 text-subhead text-fg-2 tabular-nums">
            {filtering ? `${shown.length} of 285 people` : "285 people"}
            {(!filtering || shown.length <= 3) && <span className="text-fg-3"> · {filtering ? "1 city" : "79 cities"}</span>}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 pb-1">
          <Button variant="glass">
            <CheckCircle2 size={18} strokeWidth={2.2} /> Select
          </Button>
          <Button variant="glass">
            <Globe2 size={18} strokeWidth={2.2} /> Show on globe
          </Button>
          <Button variant="primary">
            <Plus size={18} strokeWidth={2.6} /> New person
          </Button>
        </div>
      </header>
      <div className="pt-1 pb-1">
        <SearchField value={query} placeholder="Search name, role, company, city" focused={focused} caret={caret} />
        <div className="mt-1 flex items-center gap-2 py-1.5">
          <FilterPill icon={<ArrowUpDown strokeWidth={2.4} />} label="Name" />
          <span className="mx-0.5 h-5 w-[0.5px] shrink-0 bg-separator" />
          {["Category", "Warmth", "Activities", "Tags", "City"].map((f) => (
            <FilterPill key={f} label={f} />
          ))}
        </div>
      </div>
      <div className="mt-2">
        <div className="surface overflow-hidden rounded-lg">
          {ROWS.map((p) => (
            <Row key={p.name} p={p} collapse={fold(p)} highlight={query} hover={hoverRow?.name === p.name ? hoverRow.v : 0} />
          ))}
        </div>
        <section className={cn("mt-7 space-y-1.5")} style={{ opacity: filtering && query.length >= 4 ? 1 : 0 }}>
          <h2 className="px-4 text-footnote font-medium tracking-[0.02em] text-fg-3 uppercase">In notes</h2>
          <div className="surface overflow-hidden rounded-lg">
            <div className="px-4 py-3">
              <div className="text-headline text-fg">Web Summit Lisbon, day 2</div>
              <div className="mt-0.5 text-footnote text-fg-2">
                Inês Sampaio · Met Inês Sampaio, product designer at Figma. Climbs on Thursdays.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
