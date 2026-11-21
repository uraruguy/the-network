"use client";
import Link from "next/link";
import type { KeyboardEvent } from "react";
import { useNow } from "@/lib/clock";
import { formatNoteRowDate } from "@/lib/notes/grouping";
import { displayTitle, noteSnippet } from "@/lib/notes/title";
import { useIntentPrefetch } from "@/lib/queries/intent-prefetch";
import { cn } from "@/lib/utils";
import { KindGlyph } from "./kinds";

export type NoteRowNote = {
  id: string;
  title: string | null;
  /** Excerpt or full text (either works). */
  contentText?: string | null;
  excerpt?: string | null;
  kind: string;
  occurredAt: Date | string;
  pinned?: boolean | null;
};

/**
 * One note in a list, Apple Notes style: title (headline), then "14:32 · first line" in the
 * secondary colour, kind glyph at the end. Never shows "Untitled".
 */
export function NoteRow({
  note,
  href,
  person,
  personId,
  onKeyDown,
  className,
}: {
  note: NoteRowNote;
  href: string;
  /** Show whose note it is (cross-person lists, e.g. Today). */
  person?: { displayName: string } | null;
  /** The note's person (the page `href` opens), for warming the note on intent. */
  personId?: string;
  onKeyDown?: (e: KeyboardEvent<HTMLAnchorElement>) => void;
  className?: string;
}) {
  const now = useNow();
  const title = displayTitle(note);
  const snippet = noteSnippet(note);
  const prefetch = useIntentPrefetch(href, { personId, noteId: note.id });
  return (
    <Link
      href={href}
      transitionTypes={["nav-forward"]}
      {...prefetch}
      onKeyDown={onKeyDown}
      className={cn(
        "group/note block min-h-[60px] [-webkit-tap-highlight-color:transparent] rounded-sm px-4 py-2.5 outline-none transition-colors duration-150 focus-visible:bg-fill-1 active:bg-fill-2 [@media(hover:hover)]:hover:bg-fill-1",
        className,
      )}
    >
      <span className="block truncate text-headline text-fg">{title}</span>
      <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-subhead text-fg-3">
        <span className="shrink-0 tabular-nums" suppressHydrationWarning>
          {formatNoteRowDate(note.occurredAt, now)}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {person && <span className="text-fg-2">{person.displayName} · </span>}
          {snippet || <span className="text-fg-4">No additional text</span>}
        </span>
        <KindGlyph kind={note.kind} className="shrink-0 text-fg-4" />
      </span>
    </Link>
  );
}
