"use client";
import { Check, ExternalLink, NotebookPen, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KindGlyph } from "@/components/notes/kinds";
import { NAV_FORWARD } from "@/components/shell/transitions";
import { confirm } from "@/components/ui/confirm";
import { ContextMenu } from "@/components/ui/ContextMenu";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { toast } from "@/components/ui/Toast";
import { useNow } from "@/lib/clock";
import { formatShortDate } from "@/lib/format";
import { useReminderWrites, type HistoryEntry } from "@/lib/queries/reminders";
import type { PersonDetailApi } from "@/lib/queries/types";
import { cn } from "@/lib/utils";
import { DoneSheet, firstName } from "./DoneSheet";
import { historyCount, historyMeta } from "./history";

/** Entries shown before "Show all". */
const COLLAPSED = 3;

/**
 * Every follow-up marked done for this person, newest first: what it was, when it was done (and
 * due), and the note written then — or "Add note" to write one now. Hidden until the first one.
 */
export function FollowUpHistory({ person }: { person: PersonDetailApi }) {
  const entries = (person.history ?? []) as HistoryEntry[];
  const total = Math.max(person.historyCount ?? 0, entries.length);
  const [expanded, setExpanded] = useState(false);
  const [noting, setNoting] = useState<HistoryEntry | null>(null);
  const writes = useReminderWrites();
  const now = useNow();
  if (!entries.length) return null;

  const shown = expanded ? entries : entries.slice(0, COLLAPSED);
  const hidden = entries.length - shown.length;

  return (
    <InsetGroup header="Follow-up history" headerAction={<span className="text-fg-3 tabular-nums">{historyCount(total)}</span>}>
      <ul>
        {shown.map((e) => (
          <li key={e.id} className="border-b-[0.5px] border-separator last:border-b-0">
            <HistoryRow entry={e} personName={person.displayName} now={now} onAddNote={() => setNoting(e)} />
          </li>
        ))}
      </ul>
      {(hidden > 0 || expanded) && entries.length > COLLAPSED && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="pressable flex min-h-11 w-full items-center border-t-[0.5px] border-separator px-4 text-left text-body text-accent-text"
        >
          {expanded ? "Show less" : `Show all ${entries.length.toLocaleString("en")}`}
        </button>
      )}
      <DoneSheet
        open={!!noting}
        onOpenChange={(open) => !open && setNoting(null)}
        mode="note"
        title={noting ? noting.message || `Check in with ${firstName(person.displayName)}` : ""}
        subtitle={noting ? `Done ${formatShortDate(noting.completedAt, now)}` : undefined}
        personName={person.displayName}
        onConfirm={(note) => {
          if (!noting || !note) return;
          writes.addHistoryNote(noting, note);
          toast.success("Note saved", { duration: 2500 });
        }}
      />
    </InsetGroup>
  );
}

function HistoryRow({ entry: e, personName, now, onAddNote }: { entry: HistoryEntry; personName: string; now: number; onAddNote: () => void }) {
  const router = useRouter();
  const writes = useReminderWrites();
  const title = e.message || `Check in with ${firstName(personName)}`;
  const meta = historyMeta({ completedAt: e.completedAt, dueAt: e.dueAt, recurrence: e.recurrence, via: e.via }, now);
  const noteHref = e.note ? `/people/${e.personId}/notes/${e.note.id}` : null;

  const remove = async () => {
    const ok = await confirm({
      title: "Remove from history?",
      message: e.note ? "The note stays in their notes." : "This only removes the record that it was done.",
      confirmLabel: "Remove",
      destructive: true,
    });
    if (ok) writes.removeHistory(e);
  };

  const body = (
    <>
      <span className="grid size-11 shrink-0 place-items-center" aria-hidden>
        <span className="grid size-[22px] place-items-center rounded-full bg-accent-soft text-accent-text">
          <Check size={13} strokeWidth={3} />
        </span>
      </span>
      <span className="min-w-0 flex-1 py-2.5">
        <span className="block truncate text-body text-fg">{title}</span>
        <span className="mt-0.5 block text-footnote text-fg-3 tabular-nums">{meta.join(" · ")}</span>
        {e.note && (
          <span className="mt-1.5 flex min-w-0 items-start gap-1.5 text-subhead text-fg-2">
            <KindGlyph kind={e.note.kind} className="mt-0.5 shrink-0 text-fg-3" />
            <span className="line-clamp-2 min-w-0 whitespace-pre-line">{e.note.excerpt || e.note.title}</span>
          </span>
        )}
      </span>
    </>
  );

  return (
    <ContextMenu
      title={title}
      items={[
        noteHref
          ? { label: "Open note", icon: <ExternalLink />, onSelect: () => router.push(noteHref) }
          : { label: "Add note", icon: <NotebookPen />, onSelect: onAddNote },
        "separator",
        { label: "Remove from history", icon: <Trash2 />, destructive: true, onSelect: remove },
      ]}
    >
      <div className="flex min-h-[60px] items-start gap-1 pr-2 pl-1.5">
        {noteHref ? (
          <Link href={noteHref} transitionTypes={NAV_FORWARD} className="pressable flex min-w-0 flex-1 items-start gap-1 rounded-sm outline-offset-2" aria-label={`${title}, ${meta[0]}, open the note`}>
            {body}
          </Link>
        ) : (
          <>
            <div className="flex min-w-0 flex-1 items-start gap-1">{body}</div>
            <button
              type="button"
              onClick={onAddNote}
              className={cn("hit-44 relative mt-3 shrink-0 rounded-full px-2 text-footnote font-medium text-accent-text outline-offset-2")}
              aria-label={`Add a note to “${title}”`}
            >
              Add note
            </button>
          </>
        )}
      </div>
    </ContextMenu>
  );
}
