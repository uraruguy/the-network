import { Check, History, PencilLine, Sparkles, SquarePen } from "lucide-react";
import { Composer, ModelPicker, Spinner, cn } from "./parts";

type Run = { t: string; link?: boolean; bold?: boolean };
type Block = { kind: "p" | "li"; runs: Run[] };

export const QUESTION = "Who do I know in Lisbon who climbs?";
export const ANSWER: Block[] = [
  { kind: "p", runs: [{ t: "Three people in Lisbon climb:" }] },
  { kind: "li", runs: [{ t: "Inês Sampaio", link: true }, { t: " · product designer at Figma, boulders on Thursdays. You met her at Web Summit today." }] },
  { kind: "li", runs: [{ t: "Mateo Fernández", link: true }, { t: " · founder, raising a seed round. Invited you on a climbing trip to Sintra." }] },
  { kind: "li", runs: [{ t: "Valentina Dubois", link: true }, { t: " · designer. She introduced you to Inês." }] },
  { kind: "p", runs: [{ t: "Want me to plan a session with Inês this Thursday?" }] },
];
export const ANSWER_LEN = ANSWER.reduce((n, b) => n + b.runs.reduce((m, r) => m + r.t.length, 0), 0);

export type Pill = { label: string; detail?: string; state: "running" | "done"; write?: boolean };

function ToolPill({ p, appear, frame }: { p: Pill; appear: number; frame: number }) {
  const running = p.state === "running";
  return (
    <span
      className={cn("inline-flex h-7 max-w-full items-center gap-1.5 rounded-full px-2.5 text-caption font-medium select-none", running ? "bg-accent-soft text-accent-text" : "bg-fill-2 text-fg-2")}
      style={{ opacity: appear, transform: `translateY(${(1 - appear) * 4}px) scale(${0.92 + 0.08 * appear})` }}
    >
      <span className="grid size-3.5 shrink-0 place-items-center">
        {running ? <Spinner size={12} frame={frame} /> : p.write ? <PencilLine size={12} strokeWidth={2.4} className="text-accent-text" /> : <Check size={13} strokeWidth={2.8} className="text-accent-text" />}
      </span>
      <span className="truncate">
        {p.label}
        {running && "…"}
      </span>
      {p.detail && !running && <span className="truncate text-fg-3">· {p.detail}</span>}
    </span>
  );
}

function Answer({ chars }: { chars: number }) {
  let left = chars;
  const blocks: React.ReactNode[] = [];
  const items: React.ReactNode[] = [];
  const flushList = (key: number) => {
    if (items.length) blocks.push(<ul key={`ul${key}`} style={{ paddingLeft: "1.25em", margin: "0.35em 0", listStyle: "disc" }}>{items.splice(0)}</ul>);
  };
  ANSWER.forEach((b, bi) => {
    if (left <= 0) return;
    const runs = b.runs.map((r, ri) => {
      const n = Math.max(0, Math.min(r.t.length, left));
      left -= r.t.length;
      if (n <= 0) return null;
      const t = r.t.slice(0, n);
      return r.link ? (
        <span key={ri} className="font-medium text-accent-text" style={{ textDecoration: "underline", textDecorationColor: "color-mix(in oklab, var(--accent-text) 35%, transparent)", textUnderlineOffset: 3 }}>
          {t}
        </span>
      ) : (
        <span key={ri}>{t}</span>
      );
    });
    if (b.kind === "li") items.push(<li key={bi} style={{ margin: "0.2em 0" }}>{runs}</li>);
    else {
      flushList(bi);
      blocks.push(<p key={bi} style={{ margin: bi === 0 ? 0 : "0.5em 0 0" }}>{runs}</p>);
    }
  });
  flushList(99);
  return <div className="prose-chat">{blocks}</div>;
}

/**
 * Chat (ChatView + ChatSession) at desktop width: header, 760 px column, composer with the
 * Smart/Fast picker. `typed` fills the composer; after `sent` the question becomes a bubble,
 * pills run, and the answer streams `answer` characters.
 */
export function ChatPage({ typed, caret, sent, pills, answer, frame, sendPress = 0 }: { typed: string; caret: boolean; sent: number; pills: { p: Pill; appear: number }[]; answer: number; frame: number; sendPress?: number }) {
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
          {sent < 1 && (
            <div className="absolute inset-0 mx-auto flex max-w-xl flex-col items-center justify-center gap-6 py-10 text-center" style={{ opacity: 1 - sent, transform: `translateY(${-sent * 20}px)` }}>
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
                {answer > 0 && (
                  <div className="surface max-w-full rounded-lg rounded-bl-xs px-4 py-3 text-body text-fg">
                    <Answer chars={answer} />
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
