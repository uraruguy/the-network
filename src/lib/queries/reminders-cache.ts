/**
 * Pure helpers for optimistic reminder updates (unit-tested in reminders-cache.test.ts).
 *
 * Reminders live in two kinds of cache entries: the person detail (`person.reminders`, open
 * reminders soonest first, plus `nextFollowupAt`) and the reminder lists behind Today
 * (`["reminders", { until?, personId? }]`, rows carry their `person`). Every change is expressed
 * once as a `ReminderChange` and applied to whichever lists are cached.
 */
import type { Recurrence } from "@/lib/constants";

/** The fields optimistic updates touch. Dates are ISO strings on the wire (typed as Date upstream). */
export type ReminderLike = {
  id: string;
  personId: string;
  dueAt: string | Date;
  recurrence: Recurrence;
  recurrenceDays: number | null;
  message: string | null;
  status: string;
};

export type ReminderPatch = Partial<Pick<ReminderLike, "dueAt" | "message" | "recurrence" | "recurrenceDays" | "status">> & { noteId?: string | null };

export type ReminderChange =
  /** Insert or replace (create, undo of a delete, server echo). */
  | { type: "upsert"; reminder: ReminderLike & Record<string, unknown> }
  | { type: "patch"; id: string; patch: ReminderPatch }
  | { type: "remove"; id: string };

export type ListFilter = { until?: string; personId?: string };

const time = (d: string | Date) => new Date(d).getTime();

const byDue = <T extends Pick<ReminderLike, "dueAt" | "id">>(a: T, b: T) => time(a.dueAt) - time(b.dueAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Does a reminder belong in a list fetched with `filter`? */
export function matchesFilter(r: Pick<ReminderLike, "dueAt" | "personId">, filter: ListFilter = {}): boolean {
  if (filter.personId && r.personId !== filter.personId) return false;
  if (filter.until && time(r.dueAt) > time(filter.until)) return false;
  return true;
}

/**
 * Applies a change to one cached list (open reminders, soonest first). Rows that stop matching
 * the list's filter (e.g. snoozed past Today's window) drop out; `toRow` builds the list's row
 * shape for inserts (return null to skip, e.g. when the person isn't known).
 */
export function applyChange<T extends ReminderLike>(
  list: readonly T[],
  change: ReminderChange,
  filter: ListFilter = {},
  toRow: (r: ReminderLike & Record<string, unknown>, existing?: T) => T | null = (r, existing) => ({ ...existing, ...r }) as unknown as T,
): T[] {
  switch (change.type) {
    case "remove":
      return list.filter((r) => r.id !== change.id);
    case "patch": {
      const out: T[] = [];
      for (const r of list) {
        if (r.id !== change.id) out.push(r);
        else {
          const next = { ...r, ...change.patch } as T;
          if (next.status !== "done" && matchesFilter(next, filter)) out.push(next);
        }
      }
      return out.sort(byDue);
    }
    case "upsert": {
      const existing = list.find((r) => r.id === change.reminder.id);
      const rest = list.filter((r) => r.id !== change.reminder.id);
      if (change.reminder.status === "done" || !matchesFilter(change.reminder, filter)) return rest;
      const row = toRow(change.reminder, existing);
      return row ? [...rest, row].sort(byDue) : rest;
    }
  }
}

/** Earliest open due date (mirrors the `sync_next_followup` trigger), or null. */
export function earliestDue(list: readonly Pick<ReminderLike, "dueAt">[]): string | null {
  let best: number | null = null;
  for (const r of list) {
    const t = time(r.dueAt);
    if (best === null || t < best) best = t;
  }
  return best === null ? null : new Date(best).toISOString();
}

/* ---------- follow-up history (person.history, newest first, + person.historyCount) ---------- */

export type HistoryNote = { id: string; kind: string; title: string | null; excerpt: string };
/** The fields history updates touch. */
export type HistoryLike = { id: string; completedAt: string | Date; noteId: string | null; note: HistoryNote | null };

export type HistoryChange =
  /** A completion (deduplicated by id, so a replay doesn't count twice). */
  | { type: "add"; entry: HistoryLike & Record<string, unknown> }
  /** Undo of a completion, or the entry removed from the history. */
  | { type: "remove"; id: string }
  /** A note written after the fact. */
  | { type: "note"; id: string; note: HistoryNote };

const newestFirst = (a: Pick<HistoryLike, "completedAt">, b: Pick<HistoryLike, "completedAt">) => time(b.completedAt) - time(a.completedAt);

/** Applies a change to a person's cached history and its total count. */
export function applyHistory<T extends HistoryLike>(list: readonly T[], count: number, change: HistoryChange): { history: T[]; count: number } {
  switch (change.type) {
    case "add":
      if (list.some((e) => e.id === change.entry.id)) return { history: [...list], count };
      return { history: [change.entry as unknown as T, ...list].sort(newestFirst), count: count + 1 };
    case "remove": {
      const history = list.filter((e) => e.id !== change.id);
      return { history, count: history.length < list.length ? Math.max(0, count - 1) : count };
    }
    case "note":
      return { history: list.map((e) => (e.id === change.id ? { ...e, noteId: change.note.id, note: change.note } : e)), count };
  }
}

/** Looks a reminder up by id across lists (first hit wins). */
export function findIn<T extends { id: string }>(lists: readonly (readonly T[] | undefined)[], id: string): T | undefined {
  for (const l of lists) {
    const hit = l?.find((r) => r.id === id);
    if (hit) return hit;
  }
  return undefined;
}
