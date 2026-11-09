import { Check, History, PencilLine, Sparkles, SquarePen } from "lucide-react";
import { Avatar } from "../../kit/Avatar";
import { Composer, ModelPicker, Spinner, cn } from "./parts";

export const QUESTION = "Who do I know in Lisbon who climbs?";
/** The answer as the assistant links people: one row per person (avatar, name, why). */
export const ANSWER = {
  lead: "Three people in Lisbon climb:",
  rows: [
    { name: "Inês Sampaio", line: "Product designer at Figma · boulders on Thursdays. You met her at Web Summit today." },
    { name: "Mateo Fernández", line: "Founder · raising a seed round. Invited you on a climbing trip to Sintra." },
    { name: "Valentina Dubois", line: "Designer · climbs at Lisbon Boulder Lab. She introduced you to Inês." },
  ],
  tail: "Want me to plan a session with Inês on Thursday?",
};

export type Pill = { label: string; detail?: string; state: "running" | "done"; write?: boolean };

function ToolPill({ p, appear, frame }: { p: Pill; appear: number; frame: number }) {
  const running = p.state === "running";
  return (
    <span
      className={cn("inline-flex h-9 max-w-full items-center gap-2 rounded-full px-3.5 text-subhead font-medium select-none", running ? "bg-accent-soft text-accent-text" : "bg-fill-2 text-fg-2")}
      style={{ opacity: appear, transform: `translateY(${(1 - appear) * 4}px) scale(${0.92 + 0.08 * appear})` }}
    >
      <span className="grid size-4 shrink-0 place-items-center">
        {running ? <Spinner size={15} frame={frame} /> : p.write ? <PencilLine size={15} strokeWidth={2.4} className="text-accent-text" /> : <Check size={16} strokeWidth={2.8} className="text-accent-text" />}
      </span>
      <span className="truncate">
        {p.label}
        {running && "…"}
      </span>
      {p.detail && !running && <span className="truncate text-fg-3">· {p.detail}</span>}
    </span>
  );
}

/** The answer bubble: lead, person rows (pop in one by one via `rows`), tail line. */
function Answer({ lead, rows, tail }: { lead: number; rows: number[]; tail: number }) {
  return (
    <div>
      <p style={{ opacity: lead }}>{ANSWER.lead}</p>
      <div className="mt-2 space-y-1">
        {ANSWER.rows.map((r, i) => {
          const a = rows[i] ?? 0;
          return (
            <div key={r.name} className="flex items-start gap-3 rounded-md px-1 py-1.5" style={{ opacity: a, transform: `translateY(${(1 - a) * 10}px)` }}>
              <Avatar name={r.name} size={36} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-accent-text">{r.name}</div>
                <div className="text-subhead text-fg-2">{r.line}</div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-2" style={{ opacity: tail }}>
        {ANSWER.tail}
      </p>
    </div>
  );
}

/**
 * Chat (ChatView + ChatSession) at desktop width: header, 760 px column, composer with the
 * Smart/Fast picker. `typed` fills the composer; after `sent` the question becomes a bubble,
 * pills run, and the answer card fills in row by row.
 */
export function ChatPage({
  typed,
  caret,
  sent,
  pills,
  answer,
  frame,
  sendPress = 0,
  showEmpty = true,
}: {
  /** Render ChatEmpty before the first message (off when the film starts mid-question). */
  showEmpty?: boolean;
  typed: string;
  caret: boolean;
  sent: number;
  pills: { p: Pill; appear: number }[];
  answer: { lead: number; rows: number[]; tail: number } | null;
  frame: number;
  sendPress?: number;
}) {
  return (
    <div className="mx-auto flex w-full flex-col" style={{ maxWidth: 1100, padding: "32px 40px 0", height: 900 }}>
      <div className="flex flex-col" style={{ height: 836 }}>
        <header className="mx-auto mb-2 flex w-full max-w-[760px] items-center gap-2">
          <h1 className="min-w-0 flex-1 text-title1 text-fg">Chat</h1>
          <span className="glass specular grid size-11 place-items-center rounded-full text-fg-2">
            <History size={20} />
          </span>
          <span className="glass specular grid size-11 place-items-center rounded-full text-fg-2">
            <SquarePen size={20} />
          </span>
        </header>
        <div className="relative min-h-0 flex-1">
          {showEmpty && sent < 1 && (
            <div className="absolute inset-0 mx-auto flex max-w-xl flex-col items-center justify-center gap-6 py-10 text-center" style={{ opacity: Math.max(0, 1 - sent * 3), transform: `translateY(${-sent * 20}px)` }}>
              <div className="grid size-16 place-items-center rounded-full bg-accent-soft text-accent-text specular">
                <Sparkles size={28} />
              </div>
              <div className="space-y-1.5">
                <h2 className="text-title2 text-fg">Ask your network</h2>
                <p className="text-subhead text-fg-2">It reads your people, notes and follow-ups — and can add notes and reminders for you.</p>
              </div>
              <ul className="grid w-full grid-cols-2 gap-2">
                {["Who should I follow up with this week?", "Who haven't I talked to in a while?", "Who do I know in Ljubljana?", "Who could I go hiking with in Ljubljana?"].map((s) => (
                  <li key={s} className="surface flex min-h-12 items-center rounded-md px-4 py-2.5 text-left text-subhead text-fg-2">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {sent > 0 && (
            <div className="mx-auto flex w-full max-w-[760px] flex-col gap-4 pt-2 pb-6">
              <div className="flex justify-end pl-10" style={{ opacity: sent, transform: `translateY(${(1 - sent) * 30}px) scale(${0.96 + 0.04 * sent})`, transformOrigin: "right bottom" }}>
                <div className="rounded-lg rounded-br-xs bg-accent-fill px-4 py-2.5 text-body text-accent-fg specular">{QUESTION}</div>
              </div>
              <div className="flex flex-col items-start gap-2 pr-12">
                {pills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {pills.map((x, i) => (
                      <ToolPill key={i} p={x.p} appear={x.appear} frame={frame} />
                    ))}
                  </div>
                )}
                {answer && (
                  <div className="surface w-full max-w-full rounded-lg rounded-bl-xs px-4 py-3 text-body text-fg" style={{ opacity: Math.min(1, answer.lead * 2) }}>
                    <Answer {...answer} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="mx-auto w-full max-w-[760px] pt-2 pb-4">
          <Composer value={sent > 0 ? "" : typed} placeholder="Ask, add a note, plan a follow-up…" caret={caret} canSend={!!typed && sent === 0} accessory={<ModelPicker />} pressed={sendPress} />
        </div>
      </div>
    </div>
  );
}
