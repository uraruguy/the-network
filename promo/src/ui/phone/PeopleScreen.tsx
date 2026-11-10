import { ArrowUpDown, CheckCircle2, ChevronDown, Globe2, Plus, Search, SlidersHorizontal, X } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { clamp01 } from "../../kit/motion";
import { PEOPLE, STATS, WARMTH_VAR, type Person } from "../../data/demo";
import { AppBg, Caret, HomeIndicator, SAT, Screen, TabBar } from "./parts";

const LETTERS = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ#"];
const ROW = 68;

/** Accent-insensitive fold, one output char per input char (so match indices map back). */
const fold = (s: string) => [...s].map((c) => c.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase()[0] ?? c).join("");
const haystack = (p: Person) => fold([p.name, p.role, p.company, p.city].filter(Boolean).join(" "));
export const matches = (p: Person, q: string) => !q || haystack(p).includes(fold(q));

function Name({ name, q }: { name: string; q: string }) {
  const i = q ? fold(name).indexOf(fold(q)) : -1;
  if (i < 0) return <>{name}</>;
  return (
    <>
      {name.slice(0, i)}
      <mark className="rounded-[3px] bg-accent-soft font-semibold text-accent-text">{name.slice(i, i + q.length)}</mark>
      {name.slice(i + q.length)}
    </>
  );
}

export type PeopleProps = {
  /** The query typed so far. */
  query?: string;
  /** The previous query and 0→1 progress of the re-filter from it to `query`. */
  prevQuery?: string;
  k?: number;
  frame?: number;
  caret?: boolean;
  /** 0→1: the search field is focused (ring). */
  focused?: number;
  scrollY?: number;
  tab?: number;
};

/** The People list on a phone (PeopleList + FilterBar + PersonRow + A–Z index), faithful to docs/screenshots/people.jpg. */
export function PeopleScreen({ query = "", prevQuery = "", k = 1, frame = 0, caret = false, focused = 0, scrollY = 0, tab = 1 }: PeopleProps) {
  const shown = PEOPLE.filter((p) => matches(p, query)).length;
  const filtered = query.trim().length > 0;
  const summary = filtered ? `${shown} of ${STATS.people} people` : `${STATS.people} people`;
  const cities = filtered ? new Set(PEOPLE.filter((p) => matches(p, query)).map((p) => p.city)).size : STATS.cities;
  const index = filtered ? 0 : 1;
  return (
    <Screen>
      <AppBg />
      <div className="absolute inset-x-0 top-0 px-4" style={{ paddingTop: SAT + 12, transform: `translateY(${-scrollY}px)` }}>
        <header className="mb-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-large-title text-fg">People</h1>
            <p className="mt-0.5 min-h-5 text-subhead text-fg-2 tabular-nums">
              {summary}
              <span className="text-fg-3"> · {cities} {cities === 1 ? "city" : "cities"}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pb-1">
            <span className="glass specular grid h-11 w-11 place-items-center rounded-full text-fg">
              <CheckCircle2 size={18} strokeWidth={2.2} />
            </span>
            <span className="glass specular grid h-11 w-11 place-items-center rounded-full text-fg">
              <Globe2 size={18} strokeWidth={2.2} />
            </span>
            <span className="specular grid h-11 w-11 place-items-center rounded-full bg-accent-fill text-accent-fg shadow-e2">
              <Plus size={18} strokeWidth={2.6} />
            </span>
          </div>
        </header>

        <div className="pt-1 pb-1">
          <div className="relative flex h-11 w-full items-center rounded-sm bg-fill-2" style={{ boxShadow: focused ? `0 0 0 ${3 * focused}px var(--focus-ring)` : undefined }}>
            <Search size={17} strokeWidth={2.2} className="pointer-events-none absolute left-3 text-fg-3" />
            <div className="pr-9 pl-[38px] text-body">
              {query ? <span className="text-fg">{query}</span> : !caret && <span className="text-fg-3">Search name, role, company, city</span>}
              {caret && <Caret frame={frame} />}
              {caret && !query && <span className="text-fg-3">Search name, role, company, city</span>}
            </div>
            {query && (
              <span className="absolute right-2.5 grid size-[18px] place-items-center rounded-full bg-fg-4 text-bg">
                <X size={12} strokeWidth={3} />
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-2 py-1.5">
            <Pill icon={<SlidersHorizontal size={14} strokeWidth={2.6} />} label="Filters" />
            <Pill icon={<ArrowUpDown size={14} strokeWidth={2.4} />} label="Name" chevron />
          </div>
        </div>

        <ul className="surface relative mt-2 mr-3.5 overflow-hidden rounded-lg">
          {PEOPLE.map((p, i) => {
            const now = matches(p, query);
            const before = matches(p, prevQuery);
            const vis = now ? (before ? 1 : k) : before ? 1 - k : 0;
            if (vis <= 0.001) return null;
            return (
              <li key={p.name} className="relative overflow-hidden" style={{ height: ROW * vis, opacity: clamp01(vis * 1.5 - 0.3) }}>
                <Row p={p} q={query} first={i === 0} />
              </li>
            );
          })}
        </ul>
      </div>

      <div className="absolute top-1/2 right-0.5 z-20 flex -translate-y-1/2 flex-col items-center py-1" style={{ opacity: index, marginTop: 40 }}>
        {LETTERS.map((l) => (
          <span key={l} className={`grid h-3.5 w-6 place-items-center text-caption2 font-semibold ${"ABCDHJKLMNOPRSTVWZ".includes(l) ? "text-accent-text" : "text-fg-4"}`}>
            {l}
          </span>
        ))}
      </div>
      {tab >= 0 && <TabBar active={tab} />}
      {tab >= 0 && <HomeIndicator />}
    </Screen>
  );
}

function Pill({ icon, label, chevron }: { icon: React.ReactNode; label: string; chevron?: boolean }) {
  return (
    <span className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-fill-2 px-3 text-footnote font-medium whitespace-nowrap text-fg-2">
      {icon}
      {label}
      {chevron && <ChevronDown size={14} strokeWidth={2.6} className="-mr-0.5 opacity-70" />}
    </span>
  );
}

function Row({ p, q, first }: { p: Person; q: string; first: boolean }) {
  const work = [p.role, p.company].filter(Boolean).join(", ");
  const sub = [`${p.flag} ${p.city}`, work].filter(Boolean).join(" · ");
  return (
    <div className="relative flex w-full items-center gap-3 pr-4 pl-4" style={{ height: ROW }}>
      {!first && <span className="absolute top-0 right-0 left-[72px] h-[0.5px] bg-separator" />}
      <Avatar name={p.name} size={44} />
      <span className="flex min-w-0 flex-1 flex-col justify-center">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-headline text-fg">
            <Name name={p.name} q={q} />
          </span>
          <span className="size-2 shrink-0 rounded-full" style={{ background: WARMTH_VAR[p.warmth] }} />
        </span>
        <span className="mt-0.5 truncate text-footnote text-fg-2">{sub}</span>
      </span>
      <span className="flex shrink-0 flex-col items-end justify-center gap-1 self-stretch pl-1">
        <span className="text-footnote text-fg-3 tabular-nums">{p.last ?? ""}</span>
        {p.acts && <span className="text-footnote leading-none tracking-[0.08em]">{p.acts.join("")}</span>}
      </span>
    </div>
  );
}
