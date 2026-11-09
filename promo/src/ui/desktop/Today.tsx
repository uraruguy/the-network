import type { ReactNode } from "react";
import { Bell, Check, FileText, Globe2, MessageSquare, Phone, Plus, Sparkles, Undo2, Users } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { DUE, OWNER, RECONNECT, STATS, THIS_WEEK, TODAY_LABEL, type FollowUp } from "../../data/demo";
import { Button, Composer, WARMTH_COLOR, cn } from "./parts";

export type RowState = { check: number; collapse: number };

function ReminderRow({ f, state, upcoming, first }: { f: FollowUp; state?: RowState; upcoming?: boolean; first?: boolean }) {
  const check = state?.check ?? 0;
  const collapse = state?.collapse ?? 0;
  const pop = check > 0 ? 1 + 0.22 * Math.sin(Math.min(1, check) * Math.PI) : 1;
  return (
    <li
      className={cn("relative overflow-hidden", !first && "before:absolute before:top-0 before:right-0 before:left-[108px] before:h-[0.5px] before:bg-separator")}
      style={{ height: 64 * (1 - collapse), opacity: 1 - collapse * 1.2 }}
    >
      <div className="flex min-h-[64px] items-center pr-4 pl-1.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-full">
          <span
            className={cn("grid size-[24px] place-items-center rounded-full border-[1.5px]", check > 0.05 ? "border-accent-fill bg-accent-fill text-accent-fg" : "border-fg-4")}
            style={{ transform: `scale(${pop})` }}
          >
            <span style={{ transform: `scale(${0.5 + 0.5 * Math.min(1, check * 1.6)})`, opacity: Math.min(1, check * 2) }} className="grid place-items-center">
              <Check size={14} strokeWidth={3} />
            </span>
          </span>
        </span>
        <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2.5">
          <Avatar name={f.name} size={40} />
          <span className="min-w-0 flex-1" style={{ opacity: 1 - 0.5 * Math.min(1, check) }}>
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-headline text-fg">{f.name}</span>
              <span className={cn("shrink-0 text-footnote", upcoming ? "text-fg-3" : "text-accent-text")}>{f.when}</span>
            </span>
            <span className="block truncate text-subhead text-fg-2">{f.text}</span>
          </span>
        </span>
      </div>
    </li>
  );
}

function Section({ title, count, caption, action, children, className }: { title: string; count?: number | string; caption?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={className}>
      <div className="mb-2.5 px-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-baseline gap-2 text-title3 text-fg">
            {title}
            {count !== undefined && <span className="text-subhead font-medium text-fg-3 tabular-nums">{count}</span>}
          </h2>
          {action && <div className="shrink-0 text-subhead">{action}</div>}
        </div>
        {caption && <p className="mt-0.5 text-footnote text-fg-3">{caption}</p>}
      </div>
      {children}
    </section>
  );
}

function Tile({ icon, label, value, accent }: { icon: ReactNode; label: string; value: ReactNode; accent?: boolean }) {
  return (
    <div className="surface flex h-[92px] flex-col justify-between rounded-lg p-3.5">
      <span className={cn("grid size-7 place-items-center rounded-full", accent ? "bg-accent-fill text-accent-fg" : "bg-accent-soft text-accent-text")}>{icon}</span>
      <span className="min-w-0">
        <span className={cn("block h-7 text-title2 tabular-nums", accent ? "text-accent-text" : "text-fg")}>{value}</span>
        <span className="block truncate text-caption text-fg-3">{label}</span>
      </span>
    </div>
  );
}

const RECONNECT_META: Record<string, { ago: string; warmth: keyof typeof WARMTH_COLOR; label: string }> = {
  "Inês Sampaio": { ago: "2mo", warmth: "inner", label: "Close" },
  "Mateo Fernández": { ago: "3mo", warmth: "active", label: "Active" },
  "Yuki Tanaka": { ago: "2mo", warmth: "active", label: "Active" },
  "Lukas Schröder": { ago: "4mo", warmth: "inner", label: "Close" },
};

const RECENT = [
  { icon: Phone, title: "Call: she's in Berlin 12–15 May for a client workshop", who: "Sara Rossi", when: "2h ago" },
  { icon: Users, title: "Coffee at Fuglen after the design conference", who: "Sara Rossi", when: "5h ago" },
  { icon: MessageSquare, title: "Sent Ola the intro to the Index team", who: "Ola Müller", when: "Yesterday" },
  { icon: FileText, title: "Padel: lost 6–4 6–3, rematch next week", who: "Nik Zupan", when: "Tue" },
];

/**
 * Desktop Today (TodayView at xl): header, capture, stat tiles, Due + This week on the left,
 * Reconnect + Recent notes on the right.
 */
export function TodayPage({
  rows = {},
  stats,
  capture = "",
}: {
  rows?: Record<string, RowState>;
  stats?: { people: number; cities: number; due: number };
  capture?: string;
}) {
  const s = stats ?? STATS;
  const dueLeft = DUE.filter((f) => (rows[f.name]?.collapse ?? 0) < 0.5).length;
  return (
    <div className="mx-auto w-full" style={{ maxWidth: 1100, padding: "0 40px 32px" }}>
      <div className="flex h-11 items-center justify-end" style={{ marginTop: 12 }}>
        <Button variant="glass">
          <Plus size={18} strokeWidth={2.4} /> New person
        </Button>
      </div>
      <header className="pt-0.5 pb-4">
        <div className="mb-0.5 text-footnote font-semibold tracking-[0.02em] text-fg-3 uppercase">{TODAY_LABEL}</div>
        <h1 className="text-large-title text-fg">Good afternoon, {OWNER}</h1>
      </header>
      <Composer value={capture} placeholder="Who did you meet? Jot it down…" leading={<Sparkles size={18} strokeWidth={2.2} />} canSend={!!capture} />
      <div className="mt-1.5 h-4" />
      <div className="mt-6 grid grid-cols-3 gap-3">
        <Tile icon={<Users size={15} strokeWidth={2.2} />} label="People" value={s.people} />
        <Tile icon={<Globe2 size={15} strokeWidth={2.2} />} label="Cities" value={s.cities} />
        <Tile icon={<Bell size={15} strokeWidth={2.2} />} label="Due today" value={s.due} accent={s.due > 0} />
      </div>
      <div className="mt-8 grid gap-10" style={{ gridTemplateColumns: "minmax(0,1fr) minmax(0,22rem)" }}>
        <div className="min-w-0">
          <Section title="Due" count={dueLeft}>
            <ul className="surface overflow-hidden rounded-lg">
              {DUE.map((f, i) => (
                <ReminderRow key={f.name} f={f} state={rows[f.name]} first={i === 0} />
              ))}
            </ul>
          </Section>
          <Section title="This week" count={THIS_WEEK.length} className="mt-8">
            <ul className="surface overflow-hidden rounded-lg">
              {THIS_WEEK.map((f, i) => (
                <ReminderRow key={f.name} f={f} upcoming first={i === 0} />
              ))}
            </ul>
          </Section>
        </div>
        <div className="min-w-0 space-y-8">
          <Section title="Reconnect" caption="Close people you haven't talked to in two months" action={<span className="font-medium text-accent-text">See all</span>}>
            <div className="flex flex-wrap gap-2 pt-0.5 pb-1">
              {RECONNECT.slice(0, 4).map((name) => {
                const m = RECONNECT_META[name] ?? { ago: "2mo", warmth: "active" as const, label: "Active" };
                return (
                  <span key={name} className="surface flex h-14 max-w-[15rem] shrink-0 items-center gap-2.5 rounded-full pr-4 pl-2">
                    <span className="relative shrink-0">
                      <Avatar name={name} size={40} />
                      <span className="absolute -right-px -bottom-px size-3 rounded-full ring-2 ring-[var(--surface-solid)]" style={{ background: WARMTH_COLOR[m.warmth] }} />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-subhead font-semibold text-fg">{name}</span>
                      <span className="block truncate text-caption text-fg-3">
                        {m.ago} ago · {m.label}
                      </span>
                    </span>
                  </span>
                );
              })}
            </div>
          </Section>
          <Section
            title="Recent notes"
            action={
              <span className="inline-flex items-center gap-1 font-medium text-accent-text">
                <Sparkles size={14} /> Ask
              </span>
            }
          >
            <ul className="surface overflow-hidden rounded-lg">
              {RECENT.map((n, i) => (
                <li key={i} className={cn("relative", i < RECENT.length - 1 && "after:absolute after:right-0 after:bottom-0 after:left-[58px] after:h-[0.5px] after:bg-separator")}>
                  <div className="flex min-h-[56px] items-center gap-3 px-4 py-2.5">
                    <span className="grid size-[30px] shrink-0 place-items-center rounded-xs bg-accent-soft text-accent-text">
                      <n.icon size={16} strokeWidth={2.1} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-body text-fg">{n.title}</span>
                      <span className="block truncate text-footnote text-fg-3">
                        {n.who} · {n.when}
                      </span>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

/** Toast (ui/Toast.tsx) as the desktop viewport shows it: bottom-right, 380 wide, glass-thick. */
export function Toast({ title, who, description, action, icon = "undo", style }: { title: string; who?: string; description?: string; action?: string; icon?: "undo" | "success"; style?: React.CSSProperties }) {
  return (
    <div className="glass-thick specular elevation-e3 absolute rounded-xl text-fg" style={{ width: 380, right: 24, bottom: 24, ...style }}>
      <div className="flex min-h-[52px] items-center gap-3 py-2 pr-2 pl-4">
        <span className="grid shrink-0 place-items-center">
          {icon === "undo" ? (
            <Undo2 size={18} className="text-fg-3" strokeWidth={2.2} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
              <circle cx="12" cy="12" r="10" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          )}
        </span>
        <div className="min-w-0 flex-1 py-1">
          <div className="truncate text-subhead font-semibold">
            {title}
            {who && <span className="font-normal text-fg-2"> {who}</span>}
          </div>
          {description && <div className="line-clamp-2 text-footnote text-fg-2">{description}</div>}
        </div>
        {action && <span className="grid h-9 shrink-0 place-items-center rounded-full bg-accent-soft px-4 text-subhead font-semibold text-accent-text">{action}</span>}
      </div>
    </div>
  );
}
