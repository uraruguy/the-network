import { Bell, Globe2, Plus, Sparkles, ArrowUp, Users, type LucideIcon } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { clamp01 } from "../../kit/motion";
import { DUE, OWNER, STATS, THIS_WEEK, TODAY_LABEL, type FollowUp } from "../../data/demo";
import { AppBg, CheckCircle, HomeIndicator, SAT, Screen, TabBar, UndoToast } from "./parts";

const nf = new Intl.NumberFormat("en-GB");

export type TodayProps = {
  /** 0→1: stat tiles count up from zero. */
  stats?: number;
  /** 0→1: Sara's follow-up checkbox pops. */
  done?: number;
  /** 0→1: Sara's row folds away (and the counters drop by one). */
  fold?: number;
  /** 0→1: the undo toast rises. */
  toast?: number;
  scrollY?: number;
  /** The capture field has been lifted out of the screen (scene 2). */
  captureLifted?: number;
  tab?: number;
};

/** Today on a phone (TodayView: header, Capture, StatTiles, FollowUps, Reconnect), faithful to docs/screenshots/today.jpg. */
export function TodayScreen({ stats = 1, done = 0, fold = 0, toast = 0, scrollY = 0, captureLifted = 0, tab = 0 }: TodayProps) {
  const folded = fold > 0.5;
  const due = STATS.due - (folded ? 1 : 0);
  return (
    <Screen>
      <AppBg />
      <div className="absolute inset-x-0 top-0 px-4" style={{ paddingTop: SAT, transform: `translateY(${-scrollY}px)` }}>
        <div className="flex h-11 items-center justify-end">
          <span className="glass specular grid h-11 w-11 place-items-center rounded-full text-fg-2">
            <Plus size={20} strokeWidth={2.4} />
          </span>
        </div>
        <header className="pt-0.5 pb-4">
          <div className="mb-0.5 text-footnote font-semibold tracking-[0.02em] text-fg-3 uppercase">{TODAY_LABEL}</div>
          <h1 className="text-title1 text-fg">Good afternoon, {OWNER}</h1>
        </header>

        <div style={{ opacity: 1 - captureLifted * 0.85 }}>
          <CaptureField text="" />
        </div>

        <div className="mt-6 grid grid-cols-3 gap-2.5">
          <Tile icon={Users} label="People" value={Math.round(STATS.people * stats)} />
          <Tile icon={Globe2} label="Cities" value={Math.round(STATS.cities * stats)} />
          <Tile icon={Bell} label="Due today" value={Math.round(due * Math.min(1, stats * 1.4))} accent />
        </div>

        <section className="mt-8">
          <SectionTitle title="Due" count={due} />
          <ul className="surface overflow-hidden rounded-lg">
            {DUE.map((f, i) => (
              <Row key={f.name} f={f} first={i === 0} done={i === 0 ? done : 0} fold={i === 0 ? fold : 0} />
            ))}
          </ul>
        </section>

        <section className="mt-8">
          <SectionTitle title="This week" count={THIS_WEEK.length} />
          <ul className="surface overflow-hidden rounded-lg">
            {THIS_WEEK.map((f, i) => (
              <Row key={f.name} f={f} first={i === 0} upcoming />
            ))}
          </ul>
        </section>

      </div>
      {tab >= 0 && <TabBar active={tab} />}
      {toast > 0 && <UndoToast t={toast} title="Done" who="Sara Rossi" description="Send her the deck from Tuesday" />}
      {tab >= 0 && <HomeIndicator />}
    </Screen>
  );
}

/** The quick-capture Composer (glass-thick pill: sparkle, text, round send button). */
export function CaptureField({ text, caret, sendOn = false, sendPressed = 0, children }: { text: string; caret?: React.ReactNode; sendOn?: boolean; sendPressed?: number; children?: React.ReactNode }) {
  return (
    <div className="glass-thick specular flex items-end gap-2 rounded-xl p-1.5 pl-3.5">
      <span className="grid h-9 shrink-0 place-items-center text-accent-text">
        <Sparkles size={18} strokeWidth={2.2} />
      </span>
      <div className="min-h-9 flex-1 self-center py-[7px] text-body text-fg">
        {children ?? (text ? <span>{text}</span> : <span className="text-fg-4">Who did you meet? Jot it down…</span>)}
        {caret}
      </div>
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-full ${sendOn ? "bg-accent-fill text-accent-fg specular" : "bg-fill-2 text-fg-4"}`}
        style={{ transform: `scale(${1 - 0.1 * sendPressed})` }}
      >
        <ArrowUp size={19} strokeWidth={2.6} />
      </span>
    </div>
  );
}

function SectionTitle({ title, count }: { title: string; count: number }) {
  return (
    <div className="mb-2.5 px-1">
      <h2 className="flex items-baseline gap-2 text-title3 text-fg">
        {title}
        {!!count && <span className="text-subhead font-medium text-fg-3 tabular-nums">{count}</span>}
      </h2>
    </div>
  );
}

function Tile({ icon: Icon, label, value, accent }: { icon: LucideIcon; label: string; value: number; accent?: boolean }) {
  return (
    <div className="surface flex h-[92px] flex-col justify-between rounded-lg p-3.5">
      <span className={`grid size-7 place-items-center rounded-full ${accent ? "bg-accent-fill text-accent-fg" : "bg-accent-soft text-accent-text"}`}>
        <Icon size={15} strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className={`block h-7 text-title2 tabular-nums ${accent ? "text-accent-text" : "text-fg"}`}>{nf.format(value)}</span>
        <span className="block truncate text-caption text-fg-3">{label}</span>
      </span>
    </div>
  );
}

function Row({ f, first, done = 0, fold = 0, upcoming }: { f: FollowUp; first: boolean; done?: number; fold?: number; upcoming?: boolean }) {
  const h = 64 * (1 - fold);
  return (
    <li className="relative overflow-hidden" style={{ height: h, opacity: 1 - clamp01((fold - 0.2) / 0.5) }}>
      {!first && <span className="absolute top-0 right-0 left-[108px] h-[0.5px] bg-separator" />}
      <div className="flex min-h-[64px] items-center pr-4 pl-1.5">
        <CheckCircle t={done} />
        <span className="flex min-w-0 flex-1 items-center gap-3 self-stretch py-2.5">
          <Avatar name={f.name} size={40} />
          <span className="min-w-0 flex-1" style={{ opacity: 1 - 0.5 * clamp01(done * 2) }}>
            <span className="flex items-baseline gap-2">
              <span className="min-w-0 flex-1 truncate text-headline text-fg">{f.name}</span>
              <span className={`shrink-0 text-footnote ${upcoming ? "text-fg-3" : "text-accent-text"}`}>{f.when}</span>
            </span>
            <span className="block truncate text-subhead text-fg-2">{f.text}</span>
          </span>
        </span>
      </div>
    </li>
  );
}
