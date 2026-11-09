import { ArrowUp, Check, History, SquarePen } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { clamp01 } from "../../kit/motion";
import { ASK } from "../../data/demo";
import { AppBg, Caret, CHROME_BOTTOM, HomeIndicator, SAT, Screen, TabBar } from "./parts";

/** Answer rows, worded to fit two lines each in the phone's message bubble. */
const ANSWER = [
  { name: "Inês Sampaio", line: "Designer at Figma. Boulders on Thursdays." },
  { name: "Mateo Fernández", line: "Founder. Invited you to climb in Sintra." },
  { name: "Valentina Dubois", line: "Moved there in May. You owe her an intro." },
];
const ROW_H = 42;
const ROW_GAP = 10;

export type ToolPill = { label: string; doneLabel: string; detail?: string; /** 0 → 1 entering */ t: number; done: boolean };

export type ChatProps = {
  frame: number;
  /** What's in the composer. */
  draft?: string;
  caret?: boolean;
  /** 0→1: the question leaves the composer as a bubble. */
  sent?: number;
  tools?: ToolPill[];
  /** 0→1: the answer bubble appears; `chars` of the lead line and `rows` (0..3, fractional) stream in. */
  answer?: number;
  chars?: number;
  rows?: number;
  tab?: number;
};

/**
 * Chat on a phone (ChatView + Message + ToolPills + Composer), mid-thread: an earlier exchange
 * sits above, new messages stick to the bottom like useStickToBottom, so the column grows upward.
 */
export function ChatScreen({ frame, draft = "", caret = false, sent = 0, tools = [], answer = 0, chars = 0, rows = 0, tab = 3 }: ChatProps) {
  const composerBottom = CHROME_BOTTOM + 12;
  const toolsIn = clamp01(Math.max(0, ...tools.map((c) => c.t)));
  return (
    <Screen>
      <AppBg />
      {/* Conversation, stuck to the bottom above the composer */}
      <div className="absolute inset-x-0 flex flex-col justify-end px-4" style={{ bottom: composerBottom + 48 + 14, top: 0 }}>
        <div className="space-y-4">
          <div className="flex justify-end pl-10">
            <div className="specular rounded-lg rounded-br-xs bg-accent-fill px-4 py-2.5 text-body text-accent-fg">Who should I follow up with this week?</div>
          </div>
          <div className="flex flex-col items-start gap-2 pr-6">
            <div className="flex gap-1.5">
              <Pill done label="Checked follow-ups" detail="3 this week" frame={frame} />
            </div>
            <div className="surface rounded-lg rounded-bl-xs px-4 py-3 text-body text-fg">
              Two are due today: <Link>Max Larsen</Link> and <Link>Valentina Dubois</Link>. Later this week: <Link>Nik</Link>&apos;s intro to Valentina.
            </div>
          </div>
        </div>

        {sent > 0 && (
          <div style={{ height: 58 * clamp01(sent), overflow: "visible" }}>
            <div className="flex justify-end pt-4 pl-10" style={{ opacity: clamp01(sent * 3), transform: `translateY(${(1 - sent) * 40}px) scale(${0.94 + 0.06 * sent})`, transformOrigin: "100% 100%" }}>
              <div className="specular rounded-lg rounded-br-xs bg-accent-fill px-4 py-2.5 text-body text-accent-fg">{ASK.question}</div>
            </div>
          </div>
        )}

        {tools.length > 0 && (
          <div style={{ height: 44 * toolsIn }}>
            <div className="flex flex-wrap gap-1.5 pt-4">
              {tools
                .filter((c) => c.t > 0)
                .map((c) => (
                  <Pill key={c.label} label={c.done ? c.doneLabel : c.label} detail={c.done ? c.detail : undefined} done={c.done} t={clamp01(c.t)} frame={frame} />
                ))}
            </div>
          </div>
        )}

        {answer > 0 && (
          <div className="pt-2 pr-6" style={{ height: answer < 1 ? 56 * answer : undefined, opacity: clamp01(answer * 1.4), transform: `scale(${0.94 + 0.06 * answer})`, transformOrigin: "0 0" }}>
            <div className="surface w-full rounded-lg rounded-bl-xs px-4 py-3 text-body text-fg">
              <p>
                {ASK.answerLead.slice(0, chars)}
                {chars < ASK.answerLead.length && <span className="ml-0.5 inline-block size-2 rounded-full bg-fg-3 align-middle" />}
              </p>
              <div style={{ height: ANSWER.reduce((h, _, i) => h + clamp01(rows - i) * (ROW_H + ROW_GAP), 0) }}>
                {ANSWER.map((a, i) => {
                  const r = clamp01(rows - i);
                  if (r <= 0) return null;
                  return (
                    <div key={a.name} className="flex items-start gap-2.5" style={{ height: ROW_H, marginTop: ROW_GAP, opacity: r, transform: `translateY(${(1 - r) * 8}px)` }}>
                      <Avatar name={a.name} size={30} />
                      <span className="min-w-0 text-subhead leading-snug">
                        <Link>{a.name}</Link>
                        <span className="text-fg-2"> — {a.line}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header over the scrolled-away messages */}
      <div className="absolute inset-x-0 top-0 z-10 px-4" style={{ paddingTop: SAT + 12, paddingBottom: 18, background: "linear-gradient(var(--bg) 78%, transparent)" }}>
        <header className="flex w-full items-center gap-2">
          <h1 className="flex-1 text-title1 text-fg">Chat</h1>
          <span className="glass specular grid h-9 w-9 place-items-center rounded-full text-fg-2">
            <History size={18} />
          </span>
          <span className="glass specular grid h-9 w-9 place-items-center rounded-full text-fg-2">
            <SquarePen size={18} />
          </span>
        </header>
      </div>

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

function Link({ children }: { children: React.ReactNode }) {
  return <span className="font-semibold text-accent-text underline decoration-[color-mix(in_oklab,var(--accent-text)_35%,transparent)] underline-offset-[3px]">{children}</span>;
}

function Pill({ label, detail, done, t = 1, frame }: { label: string; detail?: string; done: boolean; t?: number; frame: number }) {
  return (
    <span
      className={`inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-caption font-medium ${done ? "bg-fill-2 text-fg-2" : "bg-accent-soft text-accent-text"}`}
      style={{ opacity: t, transform: `translateY(${(1 - t) * 4}px) scale(${0.92 + 0.08 * t})` }}
    >
      <span className="grid size-3.5 place-items-center">{done ? <Check size={13} strokeWidth={2.8} className="text-accent-text" /> : <Spinner frame={frame} />}</span>
      <span style={done ? undefined : shimmer(frame)}>{label}</span>
      {done && detail && <span className="text-fg-3">· {detail}</span>}
    </span>
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
