import type { ReactNode } from "react";
import { ChevronRight, Globe2, House, Minus, Plus, Route, Share2, Users, X } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { FilterPill, SearchField, WARMTH_COLOR, cn } from "./parts";

function Capsule({ children }: { children: ReactNode }) {
  return <div className="glass-map specular flex flex-col items-center rounded-full p-0.5">{children}</div>;
}
function Control({ icon, on }: { icon: ReactNode; on?: boolean }) {
  return <span className={cn("grid size-11 place-items-center rounded-full [&_svg]:size-[19px]", on ? "text-accent-text" : "text-fg-2")}>{icon}</span>;
}
const Divider = () => <span className="h-[0.5px] w-6 bg-separator" />;

export const LISBON_PEOPLE = [
  { name: "Inês Sampaio", sub: "Product designer · Figma", emoji: "🧗☕️", inner: true },
  { name: "Mateo Fernández", sub: "Founder", emoji: "🧗🎾" },
  { name: "Valentina Dubois", sub: "Designer", emoji: "🧗🍽️✈️" },
  { name: "José Silva", sub: "Architect", emoji: "🚴" },
  { name: "Camila Sampaio", sub: "Data scientist · Revolut", emoji: "🍸" },
  { name: "Diego Silva", sub: "Chef", emoji: "🍽️" },
  { name: "Inês Fernández", sub: "Photographer", emoji: "📷" },
];

/** CityPanel (desktop): the floating 360 px side panel for one city. */
function CityPanel({ appear, top }: { appear: number; top: number }) {
  return (
    <aside
      className="glass-map specular absolute z-20 flex w-[360px] flex-col overflow-hidden rounded-xl"
      style={{ right: 24, bottom: 24, top, opacity: appear, transform: `translateX(${(1 - appear) * 24}px)` }}
    >
      <div className="flex items-start gap-3 px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-title3 text-fg">
            <span className="mr-1.5">🇵🇹</span>Lisbon
          </h2>
          <p className="text-footnote text-fg-2">7 people · Portugal</p>
        </div>
        <span className="grid size-8 place-items-center rounded-full bg-fill-2 text-fg-2">
          <X size={16} strokeWidth={2.4} />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
        {LISBON_PEOPLE.map((p, i) => {
          const a = Math.max(0, Math.min(1, appear * 2.2 - i * 0.16));
          return (
            <div key={p.name} className="flex min-h-14 items-center gap-3 rounded-md px-3 py-2" style={{ opacity: a, transform: `translateY(${(1 - a) * 10}px)` }}>
              <Avatar name={p.name} size={40} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="truncate text-subhead font-semibold text-fg">{p.name}</span>
                  {p.inner && <span className="size-2 shrink-0 rounded-full" style={{ background: WARMTH_COLOR.inner }} />}
                </span>
                <span className="block truncate text-footnote text-fg-3">{p.sub}</span>
              </span>
              <span className="flex shrink-0 gap-0.5 text-subhead">{p.emoji}</span>
              <ChevronRight size={16} strokeWidth={2.4} className="shrink-0 text-fg-4" />
            </div>
          );
        })}
      </div>
      <div className="border-t-[0.5px] border-separator px-4 py-3">
        <span className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-accent-soft text-subhead font-semibold text-accent-text">
          <Users className="size-[18px]" /> Open in People
        </span>
      </div>
    </aside>
  );
}

/**
 * The full-bleed Globe page at desktop size (1204×900 main area): the globe (passed in), the
 * floating MapHeader with view switch, the map filter bar, Apple-Maps-style controls and the
 * city panel.
 */
export function GlobePage({ globe, panel = 0, count = "285 people · 79 cities" }: { globe: ReactNode; panel?: number; count?: string }) {
  return (
    <div className="absolute inset-0">
      {globe}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-6 pt-6">
        <div className="flex items-start justify-between gap-2">
          <div className="glass-map specular min-w-0 rounded-lg px-4 py-2">
            <h1 className="text-title3 leading-tight text-fg">Globe</h1>
            <p className="truncate text-footnote text-fg-2 tabular-nums">{count}</p>
          </div>
          <div className="glass-map specular rounded-full p-1">
            <span className="flex h-9 items-center rounded-full bg-fill-2 p-0.5 text-footnote font-medium">
              <span className="inline-flex h-full items-center gap-1.5 rounded-full bg-segment-thumb px-3 text-fg shadow-e1 [&_svg]:size-4">
                <Globe2 /> Globe
              </span>
              <span className="inline-flex h-full items-center gap-1.5 px-3 text-fg-2 [&_svg]:size-4">
                <Share2 /> Graph
              </span>
            </span>
          </div>
        </div>
        <div className="mt-2 flex flex-col items-start gap-2">
          <div className="glass-map flex w-[420px] min-w-0 flex-col gap-2 rounded-lg p-2">
            <SearchField value="" placeholder="Search people" size="md" />
            <div className="flex items-center gap-1.5">
              {["Category", "Warmth", "Activities", "Tags"].map((f) => (
                <FilterPill key={f} label={f} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <div className="absolute z-10 flex flex-col items-end gap-2.5" style={{ right: panel > 0.02 ? 24 + 360 + 16 : 24, bottom: 24 }}>
        <Capsule>
          <Control icon={<Plus />} />
          <Divider />
          <Control icon={<Minus />} />
        </Capsule>
        <Capsule>
          <Control icon={<House />} />
          <Divider />
          <Control icon={<Globe2 />} />
          <Divider />
          <Control icon={<Route />} on />
        </Capsule>
      </div>
      {panel > 0 && <CityPanel appear={panel} top={96} />}
    </div>
  );
}
