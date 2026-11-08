import { notFound, parseBody, withOwner } from "@/lib/api-server";
import { completeReminder, deleteReminder, reopenReminder, rescheduleReminder, snoozeReminder, updateReminder } from "@/lib/data/reminders";
import { reminderAction } from "@/lib/schemas";

/**
 * PATCH {action:"done", completionId?, noteId?} | {action:"snooze", days} | {action:"reschedule", dueAt}
 *     | {action:"reopen", dueAt, completionId?} | {action:"update", dueAt?, message?, recurrence?, recurrenceDays?} → reminder.
 */
export const PATCH = withOwner<{ id: string }>(async ({ ownerId, params, req }) => {
  const body = await parseBody(req, reminderAction);
  const r =
    body.action === "done"
      ? await completeReminder(ownerId, params.id, { completionId: body.completionId, noteId: body.noteId, via: "app" })
      : body.action === "snooze"
        ? await snoozeReminder(ownerId, params.id, body.days)
        : body.action === "reschedule"
          ? await rescheduleReminder(ownerId, params.id, new Date(body.dueAt))
          : body.action === "reopen"
            ? await reopenReminder(ownerId, params.id, new Date(body.dueAt), body.completionId)
            : await updateReminder(ownerId, params.id, { ...body, dueAt: body.dueAt ? new Date(body.dueAt) : undefined });
  return r ?? notFound();
});

export const DELETE = withOwner<{ id: string }>(async ({ ownerId, params }) => {
  await deleteReminder(ownerId, params.id);
  return { ok: true };
});
