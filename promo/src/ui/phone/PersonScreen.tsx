import type { Ref } from "react";
import { Bell, ChevronLeft, ChevronRight, Clock, MessageCircle, MoreHorizontal, NotebookPen, Palette, Phone, Plus, Sparkles, SquarePen, Users, Briefcase } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { SARA_CARD } from "../../data/demo";
import { AppBg, Chip, HomeIndicator, InsetGroup, SAT, Screen, TabBar } from "./parts";

const KIND_ICON = { note: null, meeting: Users, call: Phone, message: MessageCircle } as const;

/**
 * Sara Rossi's card on a phone (PersonDetail: top bar, header, quick actions, next follow-up,
 * notes, do together, who they are, how we met), faithful to docs/screenshots/person.jpg.
 * Elements carry `data-anchor` so scenes can point callouts at them.
 */
export function PersonScreen({ scrollY = 0, rootRef, tab = 1 }: { scrollY?: number; rootRef?: Ref<HTMLDivElement>; tab?: number }) {
  const p = SARA_CARD;
  const compact = Math.min(1, Math.max(0, (scrollY - 230) / 40));
  return (
    <Screen>
      <AppBg />
      <div ref={rootRef} className="absolute inset-x-0 top-0 px-4" style={{ paddingTop: SAT, transform: `translateY(${-scrollY}px)` }}>
        <div className="h-13" />

        <header className="flex flex-col items-center px-2 pt-2 pb-5 text-center">
          <span className="rounded-full shadow-e2" data-anchor="avatar">
            <Avatar name={p.name} size={104} />
          </span>
          <h1 className="mt-3.5 text-title1 text-fg">{p.name}</h1>
          <p className="mt-1 text-subhead text-fg-2">
            {p.role} · {p.company}
          </p>
          <p className="mt-1.5 flex items-center gap-x-1.5 text-footnote text-fg-3">
            <span>{p.flag}</span>
            {p.city} <span>·</span> <span className="tabular-nums">23:15 · 8h ahead</span>
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5" data-anchor="chips">
            <Chip size="sm">
              <span className="size-2 rounded-full" style={{ background: "var(--warm-active)" }} />
              Active
            </Chip>
            <Chip size="sm" color="var(--palette-violet)">
              <Palette size={12} />
              Design
            </Chip>
            <Chip size="sm" color="var(--palette-teal)">
              <Briefcase size={12} />
              Clients
            </Chip>
          </div>
        </header>

        <div className="mb-7 grid grid-cols-4 gap-2 px-1">
          <QuickAction icon={<NotebookPen size={22} />} label="Note" />
          <QuickAction icon={<Bell size={22} />} label="Follow up" />
          <QuickAction icon={<MessageCircle size={22} />} label="Message" disabled />
          <QuickAction icon={<Sparkles size={22} />} label="Ask" />
        </div>

        <div className="space-y-7">
          <div data-anchor="followup">
            <InsetGroup
              header="Next follow-up"
              action={
                <span className="inline-flex items-center gap-1 font-medium text-accent-text">
                  <Plus size={14} strokeWidth={2.6} />
                  Add
                </span>
              }
            >
              <div className="relative flex min-h-[60px] items-center gap-1 pr-2 pl-1.5">
                <span className="grid size-11 shrink-0 place-items-center">
                  <span className="size-[22px] rounded-full border-[1.5px] border-fg-4" />
                </span>
                <span className="min-w-0 flex-1 py-2">
                  <span className="block truncate text-body text-fg">{p.note}</span>
                  <span className="mt-0.5 block text-footnote font-medium text-accent-text">Today</span>
                </span>
                <span className="grid size-11 place-items-center text-fg-3">
                  <Clock size={20} strokeWidth={2} />
                </span>
              </div>
            </InsetGroup>
          </div>

          <section className="space-y-3" data-anchor="notes">
            <div className="flex items-center justify-between gap-3 pl-1">
              <h2 className="flex items-baseline gap-2 text-title3 text-fg">
                Notes <span className="text-subhead font-normal text-fg-3 tabular-nums">{p.notes.length}</span>
              </h2>
              <span className="grid h-11 w-11 place-items-center text-accent-text">
                <SquarePen size={20} />
              </span>
            </div>
            <div className="surface rounded-lg">
              <div className="flex items-start gap-3 px-4">
                <SquarePen size={20} className="mt-3 shrink-0 text-fg-4" />
                <span className="block min-h-12 py-3 text-body text-fg-3">New note…</span>
              </div>
            </div>
            <div className="space-y-5">
              {(["Today", "This week"] as const).map((day) => (
                <section key={day} className="space-y-1.5">
                  <h3 className="px-4 text-footnote font-semibold tracking-[0.02em] text-fg-3 uppercase">{day}</h3>
                  <ul className="surface overflow-hidden rounded-lg">
                    {p.notes
                      .filter((n) => n.day === day)
                      .map((n, i) => {
                        const Glyph = KIND_ICON[n.kind];
                        return (
                          <li key={n.title} className="relative">
                            {i > 0 && <span className="absolute top-0 right-0 left-4 h-[0.5px] bg-separator" />}
                            <div className="block min-h-[60px] px-4 py-2.5">
                              <span className="block truncate text-headline text-fg">{n.title}</span>
                              <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-subhead text-fg-3">
                                <span className="shrink-0 tabular-nums">{n.time}</span>
                                <span className="min-w-0 flex-1 truncate">{n.body ?? <span className="text-fg-4">No additional text</span>}</span>
                                {Glyph && <Glyph size={14} className="shrink-0 text-fg-4" />}
                              </span>
                            </div>
                          </li>
                        );
                      })}
                  </ul>
                </section>
              ))}
            </div>
          </section>

          <InsetGroup header="Do together" action={<span className="font-medium text-accent-text">Edit</span>}>
            <div className="flex flex-wrap gap-2 p-3">
              {[
                ["☕", "Coffee"],
                ["🎨", "Galleries"],
                ["✈️", "Travel"],
              ].map(([e, n]) => (
                <Chip key={n}>
                  <span className="text-subhead leading-none">{e}</span>
                  {n}
                </Chip>
              ))}
            </div>
          </InsetGroup>

          <InsetGroup header="Who they are" action={<span className="font-medium text-accent-text">Edit</span>}>
            <div className="flex flex-wrap gap-2 p-3" data-anchor="tags">
              <Chip color="var(--palette-violet)">design community</Chip>
              <Chip color="var(--palette-sky)">conference speakers</Chip>
            </div>
          </InsetGroup>

          <div data-anchor="met">
            <InsetGroup header="How we met">
              <div className="relative px-4 py-3">
                <p className="text-body text-fg">{p.metAt}. She gave the talk on type for small screens.</p>
                <span className="absolute right-0 bottom-0 left-4 h-[0.5px] bg-separator" />
              </div>
              <div className="relative flex min-h-11 items-center gap-3 px-4" data-anchor="intro">
                <Avatar name={p.introducedBy} size={30} />
                <span className="min-w-0 flex-1 py-2.5">
                  <span className="block truncate text-body text-fg">{p.introducedBy}</span>
                  <span className="mt-0.5 block truncate text-footnote text-fg-3">Introduced you</span>
                </span>
                <ChevronRight size={18} strokeWidth={2.4} className="-mr-1 shrink-0 text-fg-4" />
              </div>
            </InsetGroup>
          </div>
          <div style={{ height: 160 }} />
        </div>
      </div>
      {/* TopBar: sticky; glass with the compact title once the header has scrolled away. */}
      <div
        className={`absolute inset-x-0 top-0 z-20 px-2 ${compact > 0 ? "border-b-[0.5px] border-separator" : ""}`}
        style={{ paddingTop: SAT, background: `color-mix(in oklab, var(--surface-3) ${compact * 100}%, transparent)`, backdropFilter: compact > 0 ? "var(--blur-glass)" : undefined }}
      >
        <div className="grid h-13 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
          <span className="-ml-1 inline-flex h-11 items-center gap-0.5 justify-self-start pr-3 pl-1 text-body text-accent-text">
            <ChevronLeft size={24} strokeWidth={2.4} />
            People
          </span>
          <span className="truncate text-headline text-fg" style={{ opacity: compact, transform: `translateY(${(1 - compact) * 4}px)` }}>
            {p.name}
          </span>
          <span className="flex items-center gap-0.5 justify-self-end">
            <span className="px-3 text-body font-medium text-accent-text">Edit</span>
            <span className="grid h-9 w-9 place-items-center text-fg-3">
              <MoreHorizontal size={18} strokeWidth={2.2} />
            </span>
          </span>
        </div>
      </div>
      {tab >= 0 && <TabBar active={tab} />}
      {tab >= 0 && <HomeIndicator />}
    </Screen>
  );
}

function QuickAction({ icon, label, disabled }: { icon: React.ReactNode; label: string; disabled?: boolean }) {
  return (
    <span className={`flex min-w-0 flex-col items-center gap-1.5 rounded-md py-1 ${disabled ? "opacity-40" : ""}`}>
      <span className="glass specular grid size-[52px] place-items-center rounded-full text-accent-text">{icon}</span>
      <span className="max-w-full truncate text-caption font-medium text-accent-text">{label}</span>
    </span>
  );
}
