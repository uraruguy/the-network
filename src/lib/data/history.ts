import "server-only";
import type { schema } from "@/lib/db";

/*
 * Follow-up history (`reminder_completions`) as the person profile and the assistant read it:
 * shared by the profile query (./people) and the history API (./reminders).
 */

/** Entries loaded with a profile; the count covers all of them. */
export const HISTORY_LIMIT = 100;
/** Characters of the linked note shown under an entry. */
export const HISTORY_EXCERPT = 280;

type HistoryRow = Omit<schema.ReminderCompletion, "ownerId" | "createdAt" | "updatedAt"> & {
  note: { id: string; kind: schema.Note["kind"]; title: string | null; excerpt: string; deletedAt: Date | null } | null;
};

/** The linked note only while it exists (a deleted note leaves the entry without one). */
export function toHistoryEntry({ note, ...row }: HistoryRow) {
  return { ...row, note: note && !note.deletedAt ? { id: note.id, kind: note.kind, title: note.title, excerpt: note.excerpt } : null };
}
export type HistoryEntry = ReturnType<typeof toHistoryEntry>;
