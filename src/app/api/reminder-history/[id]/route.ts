import { notFound, parseBody, withOwner } from "@/lib/api-server";
import { deleteHistoryEntry, linkHistoryNote } from "@/lib/data/reminders";
import { reminderHistoryPatch } from "@/lib/schemas";

/** PATCH {noteId} → links a note written after the fact to this follow-up history entry. */
export const PATCH = withOwner<{ id: string }>(async ({ ownerId, params, req }) => {
  const { noteId } = await parseBody(req, reminderHistoryPatch);
  return (await linkHistoryNote(ownerId, params.id, noteId)) ?? notFound();
});

/** Removes the entry from the person's follow-up history; its note stays with the person. */
export const DELETE = withOwner<{ id: string }>(async ({ ownerId, params }) => {
  await deleteHistoryEntry(ownerId, params.id);
  return { ok: true };
});
