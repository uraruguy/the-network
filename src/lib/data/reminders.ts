import "server-only";
import { and, asc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { HISTORY_EXCERPT, HISTORY_LIMIT, toHistoryEntry, type HistoryEntry } from "./history";
import type { ReminderData } from "@/lib/schemas";
import { addDays, localDate, parseISODate, safeTimeZone, toISODate, zonedParts, zonedTimeToUtc, type ISODate } from "@/lib/time/zoned";
import { OPEN_REMINDER_STATUSES } from "./people";

/*
 * Follow-up reminders. `people.next_followup_at` is kept in sync by the `sync_next_followup`
 * database trigger, so nothing here has to maintain it. Calendar math (snooze, repeats) runs on
 * the owner's calendar (`profiles.timezone`), not the server's (UTC on Vercel).
 *
 * Every completion is written to `reminder_completions` (the person's follow-up history), with
 * the note written when marking it done, if any.
 */

const { reminders, reminderCompletions, people, notes, profiles } = schema;

/** Follow-ups land at 09:00 local time, like the rest of the app. */
const DEFAULT_HOUR = 9;

/** The owner's time zone, safe for Intl (unknown → UTC). */
async function ownerTimeZone(ownerId: string): Promise<string> {
  const [row] = await db.select({ timezone: profiles.timezone }).from(profiles).where(eq(profiles.id, ownerId));
  return safeTimeZone(row?.timezone);
}

const personCols = { columns: { id: true, displayName: true, avatarUrl: true, headline: true, company: true } } as const;

/** Open reminders (optionally due by `until` / for one person), soonest first. Skips deleted people. */
export async function listReminders(ownerId: string, opts: { until?: Date; personId?: string } = {}) {
  return db.query.reminders.findMany({
    where: and(
      eq(reminders.ownerId, ownerId),
      inArray(reminders.status, [...OPEN_REMINDER_STATUSES]),
      opts.until ? lte(reminders.dueAt, opts.until) : undefined,
      opts.personId ? eq(reminders.personId, opts.personId) : undefined,
      sql`exists (select 1 from people p where p.id = ${reminders.personId} and p.deleted_at is null)`,
    ),
    orderBy: [asc(reminders.dueAt)],
    with: { person: personCols },
  });
}

export type ReminderWithPerson = Awaited<ReturnType<typeof listReminders>>[number];

/** The person a follow-up is for, or null if it isn't the owner's. */
export async function reminderPersonId(ownerId: string, id: string): Promise<string | null> {
  const [row] = await db.select({ personId: reminders.personId }).from(reminders).where(and(eq(reminders.ownerId, ownerId), eq(reminders.id, id)));
  return row?.personId ?? null;
}

function getReminder(ownerId: string, id: string) {
  return db.query.reminders.findFirst({ where: and(eq(reminders.ownerId, ownerId), eq(reminders.id, id)), with: { person: personCols } });
}

/**
 * Creates a reminder for one of the owner's people. Returns null if the person isn't theirs.
 * With a client-generated `id`, re-sending is idempotent (the existing reminder is returned).
 */
export async function createReminder(ownerId: string, input: ReminderData) {
  if (input.id) {
    const [existing] = await db.select({ ownerId: reminders.ownerId }).from(reminders).where(eq(reminders.id, input.id));
    if (existing) return existing.ownerId === ownerId ? getReminder(ownerId, input.id) : null;
  }
  const [person] = await db.select({ id: people.id }).from(people).where(and(eq(people.ownerId, ownerId), eq(people.id, input.personId), isNull(people.deletedAt)));
  if (!person) return null;
  let noteId: string | null = null;
  if (input.noteId) {
    const [note] = await db.select({ id: notes.id }).from(notes).where(and(eq(notes.ownerId, ownerId), eq(notes.id, input.noteId)));
    noteId = note?.id ?? null;
  }
  const [row] = await db
    .insert(reminders)
    .values({
      ...(input.id ? { id: input.id } : {}),
      ownerId,
      personId: input.personId,
      noteId,
      dueAt: new Date(input.dueAt),
      message: input.message ?? null,
      recurrence: input.recurrence,
      recurrenceDays: input.recurrenceDays ?? null,
    })
    .returning({ id: reminders.id });
  return getReminder(ownerId, row!.id);
}

/** `date` plus `months` on the calendar, clamped to the month's last day (31 Jan + 1 → 28/29 Feb). Pure. */
export function addMonthsClamped(date: ISODate, months: number): ISODate {
  const { year, month, day } = parseISODate(date);
  const index = year * 12 + (month - 1) + months;
  const y = Math.floor(index / 12);
  const m = index - y * 12 + 1;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return toISODate(y, m, Math.min(day, lastDay));
}

/**
 * Next occurrence of a recurring reminder, or null when it doesn't recur: the calendar date of
 * `from` in `timeZone` plus the interval (month ends clamped), at `timeOf`'s local time of day —
 * a 09:00 follow-up stays at 09:00, across DST changes too. Pure.
 */
export function nextDue(from: Date, recurrence: schema.Reminder["recurrence"], days: number | null, timeZone = "UTC", timeOf: Date = from): Date | null {
  const tz = safeTimeZone(timeZone);
  const start = localDate(from, tz);
  let date: ISODate;
  switch (recurrence) {
    case "monthly":
      date = addMonthsClamped(start, 1);
      break;
    case "quarterly":
      date = addMonthsClamped(start, 3);
      break;
    case "semiannual":
      date = addMonthsClamped(start, 6);
      break;
    case "yearly":
      date = addMonthsClamped(start, 12);
      break;
    case "custom_days":
      date = addDays(start, days ?? 30);
      break;
    default:
      return null;
  }
  const { hour, minute } = zonedParts(timeOf, tz);
  return zonedTimeToUtc(date, hour, minute, tz);
}

/** `days` after today on the owner's calendar, at 09:00 local. Pure. */
export function snoozeUntil(days: number, timeZone: string, now = new Date()): Date {
  const tz = safeTimeZone(timeZone);
  return zonedTimeToUtc(addDays(localDate(now, tz), days), DEFAULT_HOUR, 0, tz);
}

/** The owner's note `id`, if it exists and isn't deleted. */
async function ownNoteId(ownerId: string, id: string | null | undefined): Promise<string | null> {
  if (!id) return null;
  const [note] = await db.select({ id: notes.id }).from(notes).where(and(eq(notes.ownerId, ownerId), eq(notes.id, id), isNull(notes.deletedAt)));
  return note?.id ?? null;
}

export type CompleteOptions = {
  /** Client-generated history entry id: a replay of the same completion changes nothing. */
  completionId?: string;
  /** The note written when marking it done. */
  noteId?: string | null;
  via?: schema.CompletionVia;
};

/**
 * Marks done and records it in the person's follow-up history; recurring reminders roll forward
 * (from today, at their usual local time) instead of closing.
 */
export async function completeReminder(ownerId: string, id: string, opts: CompleteOptions = {}) {
  if (opts.completionId) {
    const [seen] = await db.select({ ownerId: reminderCompletions.ownerId }).from(reminderCompletions).where(eq(reminderCompletions.id, opts.completionId));
    if (seen) return seen.ownerId === ownerId ? getReminder(ownerId, id) : null;
  }
  const r = await db.query.reminders.findFirst({ where: and(eq(reminders.ownerId, ownerId), eq(reminders.id, id)) });
  if (!r) return null;
  // Already done (e.g. from the app, then again from the assistant): one entry is enough.
  if (r.status === "done") return getReminder(ownerId, id);
  const next = r.recurrence === "none" ? null : nextDue(new Date(), r.recurrence, r.recurrenceDays, await ownerTimeZone(ownerId), r.dueAt);
  const noteId = await ownNoteId(ownerId, opts.noteId);
  const scope = and(eq(reminders.ownerId, ownerId), eq(reminders.id, id));
  await db.transaction(async (tx) => {
    if (next) await tx.update(reminders).set({ dueAt: next, status: "pending", sentAt: null, doneAt: null }).where(scope);
    else await tx.update(reminders).set({ status: "done", doneAt: new Date() }).where(scope);
    await tx.insert(reminderCompletions).values({
      ...(opts.completionId ? { id: opts.completionId } : {}),
      ownerId,
      personId: r.personId,
      reminderId: r.id,
      noteId,
      message: r.message,
      dueAt: r.dueAt,
      recurrence: r.recurrence,
      via: opts.via ?? "app",
    });
    await tx
      .update(people)
      .set({ lastInteractionAt: sql`greatest(coalesce(${people.lastInteractionAt}, 'epoch'::timestamptz), now())` })
      .where(and(eq(people.ownerId, ownerId), eq(people.id, r.personId)));
  });
  return getReminder(ownerId, id);
}

/** Undo of "done": removes that history entry and re-opens the follow-up at `dueAt`. */
export async function reopenReminder(ownerId: string, id: string, dueAt: Date, completionId?: string) {
  const found = await db.transaction(async (tx) => {
    if (completionId) {
      await tx
        .delete(reminderCompletions)
        .where(and(eq(reminderCompletions.ownerId, ownerId), eq(reminderCompletions.id, completionId), eq(reminderCompletions.reminderId, id)));
    }
    const rows = await tx
      .update(reminders)
      .set({ dueAt, status: "pending", sentAt: null, doneAt: null })
      .where(and(eq(reminders.ownerId, ownerId), eq(reminders.id, id)))
      .returning({ id: reminders.id });
    return rows.length > 0;
  });
  return found ? getReminder(ownerId, id) : null;
}

/** Pushes a reminder to 09:00 local time, `days` after today in the owner's time zone. */
export async function snoozeReminder(ownerId: string, id: string, days: number) {
  const due = snoozeUntil(days, await ownerTimeZone(ownerId));
  const rows = await db
    .update(reminders)
    .set({ dueAt: due, status: "snoozed", sentAt: null })
    .where(and(eq(reminders.ownerId, ownerId), eq(reminders.id, id)))
    .returning({ id: reminders.id });
  return rows.length ? getReminder(ownerId, id) : null;
}

/** Moves a reminder to an exact time and re-opens it. */
export async function rescheduleReminder(ownerId: string, id: string, dueAt: Date) {
  const rows = await db
    .update(reminders)
    .set({ dueAt, status: "pending", sentAt: null, doneAt: null })
    .where(and(eq(reminders.ownerId, ownerId), eq(reminders.id, id)))
    .returning({ id: reminders.id });
  return rows.length ? getReminder(ownerId, id) : null;
}

/** Edits a reminder in place (message, repeat, due time). A new `dueAt` re-opens it. */
export async function updateReminder(
  ownerId: string,
  id: string,
  patch: { dueAt?: Date; message?: string | null; recurrence?: schema.Reminder["recurrence"]; recurrenceDays?: number | null },
) {
  const values: Partial<typeof reminders.$inferInsert> = {};
  if (patch.dueAt) Object.assign(values, { dueAt: patch.dueAt, status: "pending", sentAt: null, doneAt: null });
  if (patch.message !== undefined) values.message = patch.message;
  if (patch.recurrence !== undefined) {
    values.recurrence = patch.recurrence;
    values.recurrenceDays = patch.recurrence === "custom_days" ? (patch.recurrenceDays ?? 30) : null;
  } else if (patch.recurrenceDays !== undefined) values.recurrenceDays = patch.recurrenceDays;
  if (Object.keys(values).length) {
    const rows = await db.update(reminders).set(values).where(and(eq(reminders.ownerId, ownerId), eq(reminders.id, id))).returning({ id: reminders.id });
    if (!rows.length) return null;
  }
  return getReminder(ownerId, id);
}

export async function deleteReminder(ownerId: string, id: string): Promise<boolean> {
  const rows = await db.delete(reminders).where(and(eq(reminders.ownerId, ownerId), eq(reminders.id, id))).returning({ id: reminders.id });
  return rows.length > 0;
}

/* ------------------------------------------------------------------ */
/*  Follow-up history                                                  */
/* ------------------------------------------------------------------ */

/** One person's follow-up history, newest first. */
export async function listHistory(ownerId: string, personId: string, limit = HISTORY_LIMIT): Promise<HistoryEntry[]> {
  const rows = await db.query.reminderCompletions.findMany({
    where: and(eq(reminderCompletions.ownerId, ownerId), eq(reminderCompletions.personId, personId)),
    columns: { ownerId: false, createdAt: false, updatedAt: false },
    orderBy: (t, { desc }) => [desc(t.completedAt)],
    limit,
    with: {
      note: {
        columns: { id: true, kind: true, title: true, deletedAt: true },
        extras: (t, { sql }) => ({ excerpt: sql<string>`left(${t.contentText}, ${HISTORY_EXCERPT})`.as("excerpt") }),
      },
    },
  });
  return rows.map(toHistoryEntry);
}

/** Links a note to a history entry (a note written after the fact). Null if either isn't the owner's. */
export async function linkHistoryNote(ownerId: string, id: string, noteId: string) {
  const owned = await ownNoteId(ownerId, noteId);
  if (!owned) return null;
  const rows = await db
    .update(reminderCompletions)
    .set({ noteId: owned })
    .where(and(eq(reminderCompletions.ownerId, ownerId), eq(reminderCompletions.id, id)))
    .returning({ id: reminderCompletions.id });
  return rows.length ? { id, noteId: owned } : null;
}

/** Removes an entry from the history (its note stays with the person). */
export async function deleteHistoryEntry(ownerId: string, id: string): Promise<boolean> {
  const rows = await db
    .delete(reminderCompletions)
    .where(and(eq(reminderCompletions.ownerId, ownerId), eq(reminderCompletions.id, id)))
    .returning({ id: reminderCompletions.id });
  return rows.length > 0;
}
