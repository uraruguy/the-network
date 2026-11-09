import { ArrowUp, Check, History, Sparkles, SquarePen } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { clamp01 } from "../../kit/motion";
import { ASK } from "../../data/demo";
import { AppBg, Caret, CHROME_BOTTOM, HomeIndicator, SAT, Screen, TabBar } from "./parts";

const SUGGESTIONS = [
  "Who should I follow up with this week?",
  "Who haven't I talked to in a while?",
  "Who do I know in Ljubljana?",
  "Who could I go hiking with in Ljubljana?",
  "What happened in my network in the last 30 days?",
];

export type ToolPill = { label: string; doneLabel: string; detail?: string; /** 0 = hidden, 0..1 entering, ≥1 running */ t: number; done: boolean };

export type ChatProps = {
  frame: number;
  /** What's in the composer. */
  draft?: string;
  caret?: boolean;
  /** 0→1: the question leaves the composer as a bubble (empty state fades away). */
  sent?: number;
  tools?: ToolPill[];
  /** 0→1: the answer bubble appears; `chars` of the lead line and `rows` (0..3, fractional) stream in. */
  answer?: number;
  chars?: number;
  rows?: number;
  /** Message list scroll (px). */
  scrollY?: number;
  tab?: number;
};

/** Chat on a phone (ChatView + ChatEmpty + Message + ToolPills + Composer). */
export function ChatScreen({ frame, draft = "", caret = false, sent = 0, tools = [], answer = 0, chars = 0, rows = 0, scrollY = 0, tab = 3 }: ChatProps) {
  const composerBottom = CHROME_BOTTOM + 12;
  return (
    <Screen>
      <AppBg />
      <div className="absolute inset-x-0 top-0 px-4" style={{ paddingTop: SAT + 12 }}>
        <header className="mb-2 flex w-full items-center gap-2">
          <h1 className="flex-1 text-title1 text-fg">Chat</h1>
          <span className="glass specular grid h-9 w-9 place-items-center rounded-full text-fg-2">
            <History size={18} />
          </span>
          <span className="glass specular grid h-9 w-9 place-items-center rounded-full text-fg-2">
            <SquarePen size={18} />
          </span>
        </header>
      </div>

      {/* Empty state */}
      <div
        className="absolute inset-x-0 flex flex-col items-center gap-6 px-4 text-center"
        style={{ top: 150, opacity: 1 - clamp01(sent * 2.2), transform: `translateY(${-30 * sent}px) scale(${1 - 0.04 * sent})` }}
      >
        <div className="specular grid size-16 place-items-center rounded-full bg-accent-soft text-accent-text">
          <Sparkles size={28} />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-title2 text-fg">Ask your network</h2>
          <p className="text-subhead text-balance text-fg-2">It reads your people, notes and follow-ups — and can add notes and reminders for you.</p>
        </div>
        <ul className="grid w-full gap-2">
          {SUGGESTIONS.map((s) => (
            <li key={s} className="surface flex min-h-12 w-full items-center rounded-md px-4 py-2.5 text-left text-subhead text-fg-2">
              {s}
            </li>
          ))}
        </ul>
      </div>

      {/* Conversation */}
      {sent > 0 && (
        <div className="absolute inset-x-0 space-y-4 px-4" style={{ top: 130 - scrollY }}>
          <div className="flex justify-end pl-10" style={{ opacity: clamp01(sent * 3), transform: `translateY(${(1 - sent) * 580}px) scale(${0.94 + 0.06 * sent})`, transformOrigin: "100% 100%" }}>
            <div className="specular rounded-lg rounded-br-xs bg-accent-fill px-4 py-2.5 text-body text-accent-fg">{ASK.question}</div>
          </div>
          <div className="flex flex-col items-start gap-2 pr-6">
            {tools.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {tools
                  .filter((c) => c.t > 0)
                  .map((c) => {
                    const e = clamp01(c.t);
                    return (
                      <span
                        key={c.label}
                        className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-caption font-medium ${c.done ? "bg-fill-2 text-fg-2" : "bg-accent-soft text-accent-text"}`}
                        style={{ opacity: e, transform: `translateY(${(1 - e) * 4}px) scale(${0.92 + 0.08 * e})` }}
                      >
                        <span className="grid size-3.5 place-items-center">{c.done ? <Check size={13} strokeWidth={2.8} className="text-accent-text" /> : <Spinner frame={frame} />}</span>
                        <span className={c.done ? undefined : "relative"} style={c.done ? undefined : shimmer(frame)}>
                          {c.done ? c.doneLabel : c.label}
                        </span>
                        {c.done && c.detail && <span className="text-fg-3">· {c.detail}</span>}
                      </span>
                    );
                  })}
              </div>
            )}
            {answer > 0 && (
              <div className="surface w-full max-w-full rounded-lg rounded-bl-xs px-4 py-3 text-body text-fg" style={{ opacity: clamp01(answer * 2), transform: `translateY(${(1 - answer) * 10}px)` }}>
                <p>
                  {ASK.answerLead.slice(0, chars)}
                  {chars < ASK.answerLead.length && <span className="ml-0.5 inline-block size-2 rounded-full bg-fg-3 align-middle" />}
                </p>
                <ul className="mt-2.5 space-y-2.5">
                  {ASK.answer.map((a, i) => {
                    const r = clamp01(rows - i);
                    if (r <= 0) return null;
                    return (
                      <li key={a.name} className="flex items-start gap-2.5" style={{ opacity: r, transform: `translateY(${(1 - r) * 8}px)` }}>
                        <Avatar name={a.name} size={30} />
                        <span className="min-w-0 text-subhead leading-snug">
                          <span className="font-semibold text-accent-text underline decoration-[color-mix(in_oklab,var(--accent-text)_35%,transparent)] underline-offset-[3px]">{a.name}</span>
                          <span className="text-fg-2"> — {a.line}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="absolute inset-x-0 z-20 px-4" style={{ bottom: composerBottom }}>
        <div className="glass-thick specular flex items-end gap-2 rounded-xl p-1.5 pl-4">
          <div className="min-h-9 flex-1 self-center py-[7px] text-body">
            {draft ? <span className="text-fg">{draft}</span> : !caret && <span className="text-fg-4">Ask, add a note, plan a follow-up…</span>}
            {caret && <Caret frame={frame} />}
            {caret && !draft && <span className="text-fg-4">Ask, add a note, plan a follow-up…</span>}
          </div>
          <span className={`grid size-9 shrink-0 place-items-center rounded-full ${draft ? "specular bg-accent-fill text-accent-fg" : "bg-fill-2 text-fg-4"}`}>
            <ArrowUp size={19} strokeWidth={2.6} />
          </span>
        </div>
      </div>
      {tab >= 0 && <TabBar active={tab} />}
      {tab >= 0 && <HomeIndicator />}
    </Screen>
  );
}

function shimmer(frame: number): React.CSSProperties {
  const pos = 100 - ((frame % 96) / 96) * 250;
  return {
    backgroundImage: "linear-gradient(90deg, currentColor 0%, currentColor 40%, color-mix(in oklab, currentColor 35%, transparent) 50%, currentColor 60%, currentColor 100%)",
    backgroundSize: "250% 100%",
    backgroundPosition: `${pos}% 0`,
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
  };
}

/** The app's spinner (12 px ring with a gap), rotated by frame. */
export function Spinner({ frame, size = 12 }: { frame: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" style={{ transform: `rotate(${(frame * 9) % 360}deg)` }}>
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.2" />
      <path d="M8 2a6 6 0 0 1 6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
