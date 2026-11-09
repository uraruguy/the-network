import type { Ref } from "react";
import { Bell, ChevronLeft, ChevronRight, Clock, Cpu, MapPin, MessageCircle, MoreHorizontal, NotebookPen, Phone, Plus, Repeat, Sparkles, SquarePen, Users } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { clamp01 } from "../../kit/motion";
import { AppBg, Chip, HomeIndicator, InsetGroup, SAT, Screen, TabBar } from "./parts";

/** John Doe's card: the person the quick capture was about (the README's "Padel rematch" row). */
export const JOHN = {
  name: "John Doe",
  role: "Software engineer · Bolt",
  city: "Ljubljana",
  flag: "🇸🇮",
};

/**
 * What the capture filed, as 0→1 arrivals: each one changes its section and flashes it.
 * `moving` adds "→ Lisbon" to the location, `padel` reschedules the rematch to "in 2 weeks",
 * `intro` inserts the intro follow-up, `note` inserts the new note at the top of Notes.
 */
export type Filed = { moving: number; padel: number; intro: number; note: number };
export const NOTHING_FILED: Filed = { moving: 0, padel: 0, intro: 0, note: 0 };
export const ALL_FILED: Filed = { moving: 1, padel: 1, intro: 1, note: 1 };

const flashBg = (t: number) => {
  // 0→1 arrival: a soft accent wash that peaks right after landing and fades.
  const a = t <= 0 ? 0 : t < 1 ? t : Math.max(0, 1 - (t - 1) / 1.2);
  return a > 0 ? `color-mix(in oklab, var(--accent) ${Math.round(a * 22)}%, transparent)` : undefined;
};

/**
 * A person on a phone (PersonDetail: sticky top bar, header, quick actions, follow-ups, notes,
 * how we met, do together). `filed` drives the sections the capture lands in; `glow` (0→2) lets
 * a landing flash linger. Elements carry `data-anchor` so scenes can aim at them.
 */
export function PersonScreen({ scrollY = 0, rootRef, tab = 1, filed = NOTHING_FILED, glow = NOTHING_FILED }: { scrollY?: number; rootRef?: Ref<HTMLDivElement>; tab?: number; filed?: Filed; glow?: Filed }) {
  const compact = clamp01((scrollY - 230) / 40);
  const padelNew = glow.padel > 0;
  return (
    <Screen>
      <AppBg />
      <div ref={rootRef} className="absolute inset-x-0 top-0 px-4" style={{ paddingTop: SAT, transform: `translateY(${-scrollY}px)` }}>
        <div className="h-13" />
        <header className="flex flex-col items-center px-2 pt-2 pb-5 text-center">
          <span className="rounded-full shadow-e2">
            <Avatar name={JOHN.name} size={104} />
          </span>
          <h1 className="mt-3.5 text-title1 text-fg">{JOHN.name}</h1>
          <p className="mt-1 text-subhead text-fg-2">{JOHN.role}</p>
          <p className="mt-1.5 flex items-center gap-x-1.5 rounded-full px-2 text-footnote text-fg-3" data-anchor="moving" style={{ background: flashBg(glow.moving) }}>
            <span>{JOHN.flag}</span>
            {JOHN.city}
            {filed.moving > 0 && (
              <span className="inline-flex items-center gap-1 font-medium text-accent-text" style={{ opacity: clamp01(filed.moving * 1.5), maxWidth: 200 * filed.moving, overflow: "hidden", whiteSpace: "nowrap" }}>
                → 🇵🇹 Lisbon in March
              </span>
            )}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5">
            <Chip size="sm">
              <span className="size-2 rounded-full" style={{ background: "var(--warm-inner)" }} />
              Inner circle
            </Chip>
            <Chip size="sm" color="var(--palette-green)">
              <Users size={12} />
              Friends
            </Chip>
            <Chip size="sm" color="var(--palette-sky)">
              <Cpu size={12} />
              Tech
            </Chip>
          </div>
        </header>

        <div className="mb-7 grid grid-cols-4 gap-2 px-1">
          <QuickAction icon={<NotebookPen size={22} />} label="Note" />
          <QuickAction icon={<Bell size={22} />} label="Follow up" />
          <QuickAction icon={<MessageCircle size={22} />} label="Message" />
          <QuickAction icon={<Sparkles size={22} />} label="Ask" />
        </div>

        <div className="space-y-7">
          <div data-anchor="followups">
            <InsetGroup
              header="Follow-ups"
              action={
                <span className="inline-flex items-center gap-1 font-medium text-accent-text">
                  <Plus size={14} strokeWidth={2.6} />
                  Add
                </span>
              }
            >
              <Grow t={filed.intro} h={60} show={clamp01(glow.intro * 2)}>
                <FollowUpRow anchor="intro" title="Intro to Marie Dupont" when="This week" tone="text-accent-text" bg={flashBg(glow.intro)} />
              </Grow>
              <FollowUpRow
                anchor="padel"
                title="Padel rematch"
                when={padelNew ? "in 2 weeks · Fri, 13 Nov" : "Tomorrow"}
                tone={padelNew ? "text-accent-text" : "text-fg-3"}
                repeat={padelNew}
                bg={flashBg(glow.padel)}
                divider={filed.intro > 0}
              />
            </InsetGroup>
          </div>

          <section className="space-y-3" data-anchor="notes">
            <div className="flex items-center justify-between gap-3 pl-1">
              <h2 className="flex items-baseline gap-2 text-title3 text-fg">
                Notes <span className="text-subhead font-normal text-fg-3 tabular-nums">{glow.note > 0 ? 4 : 3}</span>
              </h2>
              <span className="grid h-11 w-11 place-items-center text-accent-text">
                <SquarePen size={20} />
              </span>
            </div>
            <div>
              <Grow t={filed.note} h={92} show={clamp01(glow.note * 2)}>
                <section className="space-y-1.5 pb-5">
                  <h3 className="px-4 text-footnote font-semibold tracking-[0.02em] text-fg-3 uppercase">Today</h3>
                  <ul className="surface overflow-hidden rounded-lg">
                    <NoteRow anchor="note" title="Coffee with John Doe." body="Moving to Lisbon in March, wants an intro to Marie." time="15:42" bg={flashBg(glow.note)} />
                  </ul>
                </section>
              </Grow>
              <section className="space-y-1.5">
                <h3 className="px-4 text-footnote font-semibold tracking-[0.02em] text-fg-3 uppercase">This week</h3>
                <ul className="surface overflow-hidden rounded-lg">
                  <NoteRow title="Padel at Tivoli: he won 6–4, 6–3" body="Rematch before he moves." time="Tue" kind="meeting" />
                </ul>
              </section>
              <section className="mt-5 space-y-1.5" data-anchor="older">
                <h3 className="px-4 text-footnote font-semibold tracking-[0.02em] text-fg-3 uppercase">October</h3>
                <ul className="surface overflow-hidden rounded-lg">
                  <NoteRow title="Call: thinking about leaving Bolt" body="Wants a smaller team, maybe climbing tech." time="14 Oct" kind="call" />
                  <NoteRow title="Sent him the Sintra climbing guide" time="3 Oct" kind="message" divider />
                </ul>
              </section>
            </div>
          </section>

          <div data-anchor="met">
            <InsetGroup header="How we met">
              <div className="relative px-4 py-3">
                <p className="text-body text-fg">Padel league at Tivoli, spring 2022. He was my doubles partner for a season.</p>
                <span className="absolute right-0 bottom-0 left-4 h-[0.5px] bg-separator" />
              </div>
              <div className="flex min-h-11 items-center gap-3 px-4">
                <span className="grid size-[30px] shrink-0 place-items-center text-accent-text">
                  <MapPin size={20} />
                </span>
                <span className="min-w-0 flex-1 py-2.5 text-body text-fg">Met in</span>
                <span className="text-body text-fg-3">🇸🇮 Ljubljana</span>
                <ChevronRight size={18} strokeWidth={2.4} className="-mr-1 shrink-0 text-fg-4" />
              </div>
            </InsetGroup>
          </div>

          <InsetGroup header="Do together" action={<span className="font-medium text-accent-text">Edit</span>}>
            <div className="flex flex-wrap gap-2 p-3">
              {[
                ["🎾", "Padel"],
                ["🧗", "Climbing"],
                ["☕", "Coffee"],
              ].map(([e, n]) => (
                <Chip key={n}>
                  <span className="text-subhead leading-none">{e}</span>
                  {n}
                </Chip>
              ))}
            </div>
          </InsetGroup>
          <div style={{ height: 200 }} />
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
            {JOHN.name}
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

/** Height-animated insert (motion's `height: 0 → auto` in the app's lists). */
function Grow({ t, h, show, children }: { t: number; h: number; show: number; children: React.ReactNode }) {
  if (t <= 0) return <div data-grow style={{ height: 0, overflow: "hidden", opacity: 0 }}>{children}</div>;
  const k = clamp01(t);
  // The slot opens first (empty); its content appears when the chip lands in it.
  return <div style={{ height: k >= 1 ? "auto" : h * k, overflow: k >= 1 ? undefined : "hidden", opacity: show }}>{children}</div>;
}

function FollowUpRow({ anchor, title, when, tone, repeat, bg, divider }: { anchor: string; title: string; when: string; tone: string; repeat?: boolean; bg?: string; divider?: boolean }) {
  return (
    <div className="relative flex min-h-[60px] items-center gap-1 pr-2 pl-1.5" data-anchor={anchor} style={{ background: bg }}>
      {divider && <span className="absolute top-0 right-0 left-[50px] h-[0.5px] bg-separator" />}
      <span className="grid size-11 shrink-0 place-items-center">
        <span className="size-[22px] rounded-full border-[1.5px] border-fg-4" />
      </span>
      <span className="min-w-0 flex-1 py-2">
        <span className="block truncate text-body text-fg">{title}</span>
        <span className={`mt-0.5 flex items-center gap-1.5 text-footnote font-medium ${tone}`}>
          {when}
          {repeat && <Repeat size={11} strokeWidth={2.4} className="text-fg-3" />}
        </span>
      </span>
      <span className="grid size-11 place-items-center text-fg-3">
        <Clock size={20} strokeWidth={2} />
      </span>
    </div>
  );
}

const KIND = { meeting: Users, call: Phone, message: MessageCircle } as const;

function NoteRow({ anchor, title, body, time, kind, bg, divider }: { anchor?: string; title: string; body?: string; time: string; kind?: keyof typeof KIND; bg?: string; divider?: boolean }) {
  const Glyph = kind ? KIND[kind] : null;
  return (
    <li className="relative" data-anchor={anchor} style={{ background: bg }}>
      {divider && <span className="absolute top-0 right-0 left-4 h-[0.5px] bg-separator" />}
      <div className="block min-h-[60px] px-4 py-2.5">
        <span className="block truncate text-headline text-fg">{title}</span>
        <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-subhead text-fg-3">
          <span className="shrink-0 tabular-nums">{time}</span>
          <span className="min-w-0 flex-1 truncate">{body ?? <span className="text-fg-4">No additional text</span>}</span>
          {Glyph && <Glyph size={14} className="shrink-0 text-fg-4" />}
        </span>
      </div>
    </li>
  );
}

function QuickAction({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="flex min-w-0 flex-col items-center gap-1.5 rounded-md py-1">
      <span className="glass specular grid size-[52px] place-items-center rounded-full text-accent-text">{icon}</span>
      <span className="max-w-full truncate text-caption font-medium text-accent-text">{label}</span>
    </span>
  );
}
