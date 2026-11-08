"use client";
import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { addDays, startOfDay } from "date-fns";
import { nextOccurrence } from "@/components/followups/recurrence";
import { toast } from "@/components/ui/Toast";
import { api } from "@/lib/api";
import type { NoteKind } from "@/lib/constants";
import type { ReminderWithPerson } from "@/lib/data/reminders";
import { plainTextToMarkdown } from "@/lib/notes/paste";
import { titleFromText } from "@/lib/notes/title";
import type { ReminderAction, ReminderInput } from "@/lib/schemas";
import { keys } from "./keys";
import { deleteNote, saveNote } from "./notes";
import { applyChange, applyHistory, earliestDue, findIn, type HistoryChange, type ListFilter, type ReminderChange, type ReminderLike, type ReminderPatch } from "./reminders-cache";
import type { PersonDetailApi, PersonIndexRow } from "./types";
import { noteEntity, ParentPendingError, personEntity, reminderEntity, scopeFor, waitForParent } from "./write-order";

export type { ReminderWithPerson };
/** An open reminder as embedded in a person's detail (no `person`). */
export type OpenReminder = PersonDetailApi["reminders"][number];
/** Either row shape — what `ReminderRow` renders. */
export type AnyReminder = OpenReminder | ReminderWithPerson;
export type ReminderPerson = ReminderWithPerson["person"];
/** One completed follow-up in a person's history (newest first in `PersonDetailApi.history`). */
export type HistoryEntry = PersonDetailApi["history"][number];
/** The note written when marking a follow-up done (or added to its history entry later). */
export type DoneNote = { text: string; kind: NoteKind };
/** What a completion created, for its Undo. */
export type DoneReceipt = { completionId: string; noteId: string | null };

/* ---------- reads ---------- */

export function useReminders(opts: { until?: string; personId?: string } = {}, query: { enabled?: boolean } = {}) {
  const p = new URLSearchParams();
  if (opts.until) p.set("until", opts.until);
  if (opts.personId) p.set("person", opts.personId);
  const qs = p.toString();
  return useQuery({ queryKey: keys.reminders(opts), queryFn: () => api.get<ReminderWithPerson[]>(`/api/reminders${qs ? `?${qs}` : ""}`), enabled: query.enabled ?? true });
}

/** Finds a reminder in any cached list (person details and Today lists). */
export function findCachedReminder(qc: QueryClient, id: string, personId?: string): AnyReminder | undefined {
  const lists: (readonly AnyReminder[] | undefined)[] = [];
  if (personId) lists.push(qc.getQueryData<PersonDetailApi>(keys.person(personId))?.reminders);
  for (const [, data] of qc.getQueriesData<ReminderWithPerson[]>({ queryKey: ["reminders"] })) lists.push(data);
  for (const [, data] of qc.getQueriesData<PersonDetailApi>({ queryKey: ["person"] })) lists.push(data?.reminders);
  return findIn(lists, id);
}

/* ---------- optimistic cache plumbing ---------- */

function personFor(qc: QueryClient, personId: string): ReminderPerson | null {
  const d = qc.getQueryData<PersonDetailApi>(keys.person(personId));
  if (d) return { id: d.id, displayName: d.displayName, avatarUrl: d.avatarUrl, headline: d.headline, company: d.company };
  const row = qc.getQueryData<PersonIndexRow[]>(keys.peopleIndex())?.find((p) => p.id === personId);
  return row ? { id: row.id, displayName: row.displayName, avatarUrl: row.avatarUrl, headline: row.headline, company: row.company } : null;
}

/** Applies one change to every cached list that holds reminders for `personId`. */
export function applyReminderChange(qc: QueryClient, personId: string, change: ReminderChange) {
  // Person detail: open reminders + nextFollowupAt.
  let nextFollowupAt: string | null | undefined;
  qc.setQueryData<PersonDetailApi>(keys.person(personId), (p) => {
    if (!p) return p;
    const reminders = applyChange(p.reminders as unknown as ReminderLike[], change, {}, (r, existing) => ({ ...existing, ...stripPerson(r) }) as ReminderLike);
    nextFollowupAt = earliestDue(reminders);
    return { ...p, reminders, nextFollowupAt } as unknown as PersonDetailApi;
  });
  // Today / per-person lists.
  const person = personFor(qc, personId);
  for (const [key, data] of qc.getQueriesData<ReminderWithPerson[]>({ queryKey: ["reminders"] })) {
    if (!data) continue;
    const filter = (key[1] ?? {}) as ListFilter;
    const next = applyChange(data as unknown as (ReminderLike & { person?: ReminderPerson })[], change, filter, (r, existing) => {
      const p = existing?.person ?? (r.person as ReminderPerson | undefined) ?? person;
      return p ? ({ ...existing, ...r, person: p } as ReminderLike & { person: ReminderPerson }) : null;
    });
    qc.setQueryData(key, next);
  }
  // People index: the row's next follow-up (known exactly when the detail is cached).
  if (nextFollowupAt !== undefined) {
    qc.setQueryData<PersonIndexRow[]>(keys.peopleIndex(), (rows) =>
      rows?.map((r) => (r.id === personId ? ({ ...r, nextFollowupAt } as unknown as PersonIndexRow) : r)),
    );
  }
}

function stripPerson(r: Record<string, unknown>) {
  const { person: _person, ...rest } = r;
  return rest;
}

/** Applies one change to the person's cached follow-up history (and its count). */
export function applyHistoryChange(qc: QueryClient, personId: string, change: HistoryChange) {
  qc.setQueryData<PersonDetailApi>(keys.person(personId), (p) => {
    if (!p) return p;
    const { history, count } = applyHistory((p.history ?? []) as unknown as HistoryEntry[], p.historyCount ?? 0, change);
    return { ...p, history, historyCount: count } as unknown as PersonDetailApi;
  });
}

/** The history entry a completion adds, from the reminder as cached (null when it isn't cached). */
function historyEntryFor(qc: QueryClient, v: ReminderActionVars & { action: "done" }): { personId: string; entry: HistoryEntry } | null {
  if (!v.completionId) return null;
  const r = findCachedReminder(qc, v.id, v.personId);
  const personId = v.personId ?? r?.personId;
  if (!r || !personId) return null;
  const entry = {
    id: v.completionId,
    personId,
    reminderId: r.id,
    noteId: v.noteId ?? null,
    message: r.message,
    dueAt: r.dueAt,
    recurrence: r.recurrence,
    via: "app",
    completedAt: new Date().toISOString(),
    note: v.noteId && v.notePreview ? { id: v.noteId, kind: v.notePreview.kind, title: v.notePreview.title, excerpt: v.notePreview.excerpt } : null,
  };
  return { personId, entry: entry as unknown as HistoryEntry };
}

/** Server truth for everything a reminder touches — skipped while other reminder writes are in flight. */
function settle(qc: QueryClient, personId: string | undefined) {
  if (qc.isMutating({ mutationKey: ["reminders"] }) > 1) return;
  qc.invalidateQueries({ queryKey: ["reminders"] });
  qc.invalidateQueries({ queryKey: keys.peopleIndex() });
  qc.invalidateQueries({ queryKey: keys.stats() });
  if (personId) qc.invalidateQueries({ queryKey: keys.person(personId) });
}

function failed(qc: QueryClient, personId: string | undefined, message: string) {
  return (e: unknown) => {
    toast.error(message, { description: e instanceof Error ? e.message : undefined });
    qc.invalidateQueries({ queryKey: ["reminders"] });
    if (personId) qc.invalidateQueries({ queryKey: keys.person(personId) });
  };
}

/* ---------- mutations ---------- */

export const REMINDER_MUT = {
  create: ["reminders", "create"] as const,
  action: ["reminders", "action"] as const,
  delete: ["reminders", "delete"] as const,
  /** Follow-up history entries: link a note, remove the entry. */
  history: ["reminders", "history"] as const,
};

/** Shown in the history entry until the server's copy arrives; never sent. */
export type NotePreview = { kind: NoteKind; title: string | null; excerpt: string };

export type CreateReminderVars = ReminderInput & { id: string };
export type ReminderActionVars = { id: string; personId?: string; notePreview?: NotePreview } & ReminderAction;
export type DeleteReminderVars = { id: string; personId: string };
export type HistoryVars = { id: string; personId: string } & ({ op: "link"; noteId: string; notePreview: NotePreview } | { op: "delete" });

/** Local due time for snoozes on the server's terms (`snooze {days}` = that many days ahead, 09:00). */
const snoozeDue = (days: number) => {
  const d = addDays(startOfDay(new Date()), days);
  d.setHours(9, 0, 0, 0);
  return d.toISOString();
};

/** The optimistic change an action implies, given the reminder as currently cached. */
function changeForAction(qc: QueryClient, v: ReminderActionVars): ReminderChange | null {
  switch (v.action) {
    case "done": {
      const r = findCachedReminder(qc, v.id, v.personId);
      const next = r ? nextOccurrence(new Date(), r.recurrence, r.recurrenceDays) : null;
      return next ? { type: "patch", id: v.id, patch: { dueAt: next.toISOString(), status: "pending" } } : { type: "remove", id: v.id };
    }
    case "snooze":
      return { type: "patch", id: v.id, patch: { dueAt: snoozeDue(v.days), status: "snoozed" } };
    case "reschedule":
    case "reopen":
      return { type: "patch", id: v.id, patch: { dueAt: v.dueAt, status: "pending" } };
    case "update": {
      const patch: ReminderPatch = {};
      if (v.dueAt) Object.assign(patch, { dueAt: v.dueAt, status: "pending" });
      if (v.message !== undefined) patch.message = v.message?.trim() ? v.message.trim() : null;
      if (v.recurrence !== undefined) {
        patch.recurrence = v.recurrence;
        patch.recurrenceDays = v.recurrence === "custom_days" ? (v.recurrenceDays ?? 30) : null;
      }
      return { type: "patch", id: v.id, patch };
    }
  }
}

/**
 * Mutation defaults (registered once at startup) so writes made offline survive a reload and
 * replay in order: every write runs in the scope `reminder:<id>`, and the optimistic cache change
 * happens in `onMutate` (skipped when a persisted mutation resumes — its change is already cached).
 */
export function registerReminderMutations(qc: QueryClient) {
  qc.setMutationDefaults<ReminderWithPerson, Error, CreateReminderVars>(REMINDER_MUT.create, {
    mutationFn: (input: CreateReminderVars) =>
      api.post<ReminderWithPerson>("/api/reminders", input).catch((e: unknown) => {
        throw waitForParent(qc, e, personEntity(input.personId));
      }),
    // A 404 while the person's create is still queued waits for it; anything else a few times.
    retry: (count: number, e: Error) => e instanceof ParentPendingError || count < 3,
    onMutate: async (v: CreateReminderVars) => {
      const now = new Date().toISOString();
      applyReminderChange(qc, v.personId, {
        type: "upsert",
        reminder: {
          id: v.id,
          ownerId: "",
          personId: v.personId,
          noteId: v.noteId ?? null,
          dueAt: v.dueAt,
          message: v.message?.trim() ? v.message.trim() : null,
          recurrence: v.recurrence ?? "none",
          recurrenceDays: v.recurrence === "custom_days" ? (v.recurrenceDays ?? 30) : null,
          status: "pending",
          sentAt: null,
          doneAt: null,
          sourceKind: null,
          sourceRef: null,
          createdAt: now,
          updatedAt: now,
        },
      });
    },
    onSuccess: (r: ReminderWithPerson) => applyReminderChange(qc, r.personId, { type: "upsert", reminder: r as unknown as ReminderLike & Record<string, unknown> }),
    onError: (e: unknown, v: CreateReminderVars) => {
      applyReminderChange(qc, v.personId, { type: "remove", id: v.id });
      failed(qc, v.personId, "Couldn’t save the follow-up")(e);
    },
    onSettled: (_d: unknown, _e: unknown, v: CreateReminderVars) => settle(qc, v.personId),
  });
  qc.setMutationDefaults<ReminderWithPerson, Error, ReminderActionVars>(REMINDER_MUT.action, {
    mutationFn: ({ id, personId: _p, notePreview: _n, ...body }: ReminderActionVars) => api.patch<ReminderWithPerson>(`/api/reminders/${id}`, body),
    onMutate: async (v: ReminderActionVars) => {
      const personId = v.personId ?? findCachedReminder(qc, v.id)?.personId;
      // The history entry first: it reads the reminder before the change below moves or removes it.
      const added = v.action === "done" ? historyEntryFor(qc, v) : null;
      if (added) applyHistoryChange(qc, added.personId, { type: "add", entry: added.entry });
      if (v.action === "reopen" && v.completionId && personId) applyHistoryChange(qc, personId, { type: "remove", id: v.completionId });
      const change = changeForAction(qc, v);
      if (personId && change) applyReminderChange(qc, personId, change);
    },
    onSuccess: (r: ReminderWithPerson) =>
      applyReminderChange(
        qc,
        r.personId,
        r.status === "done" ? { type: "remove", id: r.id } : { type: "upsert", reminder: r as unknown as ReminderLike & Record<string, unknown> },
      ),
    onError: (e: unknown, v: ReminderActionVars) => failed(qc, v.personId, "Couldn’t update the follow-up")(e),
    onSettled: (_d: unknown, _e: unknown, v: ReminderActionVars) => settle(qc, v.personId),
  });
  qc.setMutationDefaults<unknown, Error, DeleteReminderVars>(REMINDER_MUT.delete, {
    mutationFn: ({ id }: DeleteReminderVars) => api.delete(`/api/reminders/${id}`),
    onMutate: async (v: DeleteReminderVars) => applyReminderChange(qc, v.personId, { type: "remove", id: v.id }),
    onError: (e: unknown, v: DeleteReminderVars) => failed(qc, v.personId, "Couldn’t delete the follow-up")(e),
    onSettled: (_d: unknown, _e: unknown, v: DeleteReminderVars) => settle(qc, v.personId),
  });
  qc.setMutationDefaults<unknown, Error, HistoryVars>(REMINDER_MUT.history, {
    mutationFn: (v: HistoryVars) =>
      v.op === "link" ? api.patch(`/api/reminder-history/${v.id}`, { noteId: v.noteId }) : api.delete(`/api/reminder-history/${v.id}`),
    onMutate: async (v: HistoryVars) =>
      applyHistoryChange(
        qc,
        v.personId,
        v.op === "link" ? { type: "note", id: v.id, note: { id: v.noteId, ...v.notePreview } } : { type: "remove", id: v.id },
      ),
    onError: (e: unknown, v: HistoryVars) => failed(qc, v.personId, v.op === "link" ? "Couldn’t add the note" : "Couldn’t remove it from the history")(e),
    onSettled: (_d: unknown, _e: unknown, v: HistoryVars) => settle(qc, v.personId),
  });
}

/** Saves `note` as a new note on the person (offline-safe, like the note composer) and returns its id and preview. */
function saveDoneNote(qc: QueryClient, personId: string, note: DoneNote | null | undefined): { id: string; preview: NotePreview } | null {
  const text = note?.text.trim();
  if (!note || !text) return null;
  const id = crypto.randomUUID();
  const title = titleFromText(text);
  saveNote(
    qc,
    id,
    { personId, title, contentJson: null, contentMd: plainTextToMarkdown(text, { titleFirstLine: true }), contentText: text, kind: note.kind, occurredAt: new Date().toISOString() },
    { isNew: true, sync: true },
  );
  return { id, preview: { kind: note.kind, title, excerpt: text.slice(0, 280) } };
}

/**
 * Runs a mutation through its registered defaults, serialized with other writes to the same
 * reminder — and behind its note's first save or its person's create while those are queued
 * (see ./write-order), so the server links the note and knows the person.
 */
function run<TData, TVars>(qc: QueryClient, mutationKey: readonly unknown[], variables: TVars, reminderId: string): Promise<TData> {
  const v = variables as { personId?: string; noteId?: string | null };
  const scope = scopeFor(qc, reminderEntity(reminderId), [noteEntity(v.noteId), personEntity(v.personId)]);
  const mutation = qc.getMutationCache().build<TData, Error, TVars, unknown>(qc, { mutationKey, scope: { id: scope } });
  return mutation.execute(variables);
}

const ignore = () => {};

/** Snapshot of a reminder sufficient to re-create it (undo of done/delete). */
export type ReminderSnapshot = Pick<OpenReminder, "id" | "personId" | "noteId" | "message" | "recurrence" | "recurrenceDays"> & { dueAt: string | Date };

/**
 * Fire-and-forget reminder writes: the cache updates instantly, the request runs (or waits for
 * the network) in the background, failures toast and resync.
 */
export function useReminderWrites() {
  const qc = useQueryClient();
  return useMemo(
    () => ({
      /** Creates a follow-up; returns its (client-generated) id. */
      create(input: ReminderInput): string {
        const id = input.id ?? crypto.randomUUID();
        run(qc, REMINDER_MUT.create, { ...input, id }, id).catch(ignore);
        return id;
      },
      /**
       * Marks done and adds it to the person's follow-up history, with `note` (if it has words)
       * saved as a note on the person first. Returns what to pass to `undoDone`.
       */
      done(r: Pick<ReminderSnapshot, "id" | "personId">, note?: DoneNote | null): DoneReceipt {
        const completionId = crypto.randomUUID();
        const saved = saveDoneNote(qc, r.personId, note);
        run(
          qc,
          REMINDER_MUT.action,
          { id: r.id, personId: r.personId, action: "done", completionId, noteId: saved?.id ?? null, notePreview: saved?.preview },
          r.id,
        ).catch(ignore);
        return { completionId, noteId: saved?.id ?? null };
      },
      reschedule(r: Pick<ReminderSnapshot, "id" | "personId">, dueAt: string) {
        run(qc, REMINDER_MUT.action, { id: r.id, personId: r.personId, action: "reschedule", dueAt }, r.id).catch(ignore);
      },
      update(r: Pick<ReminderSnapshot, "id" | "personId">, patch: Omit<Extract<ReminderAction, { action: "update" }>, "action">) {
        run(qc, REMINDER_MUT.action, { id: r.id, personId: r.personId, action: "update", ...patch }, r.id).catch(ignore);
      },
      remove(r: Pick<ReminderSnapshot, "id" | "personId">) {
        run(qc, REMINDER_MUT.delete, { id: r.id, personId: r.personId }, r.id).catch(ignore);
      },
      /**
       * Undo for "done": puts the reminder back exactly as it was (re-opens or rolls back the
       * repeat), drops its history entry and the note written with it.
       */
      undoDone(r: ReminderSnapshot, receipt?: DoneReceipt) {
        const dueAt = new Date(r.dueAt).toISOString();
        if (receipt?.noteId) deleteNote(qc, { id: receipt.noteId, personId: r.personId }, { undo: false });
        run(qc, REMINDER_MUT.action, { id: r.id, personId: r.personId, action: "reopen", dueAt, completionId: receipt?.completionId }, r.id).catch(ignore);
      },
      /** A note written after the fact, saved on the person and linked to the history entry. */
      addHistoryNote(entry: Pick<HistoryEntry, "id" | "personId">, note: DoneNote) {
        const saved = saveDoneNote(qc, entry.personId, note);
        if (!saved) return;
        run(qc, REMINDER_MUT.history, { id: entry.id, personId: entry.personId, op: "link", noteId: saved.id, notePreview: saved.preview }, entry.id).catch(ignore);
      },
      /** Removes an entry from the history (its note stays with the person). */
      removeHistory(entry: Pick<HistoryEntry, "id" | "personId">) {
        run(qc, REMINDER_MUT.history, { id: entry.id, personId: entry.personId, op: "delete" }, entry.id).catch(ignore);
      },
      /** Undo for "delete": re-creates it with the same id. */
      restore(r: ReminderSnapshot) {
        run(
          qc,
          REMINDER_MUT.create,
          {
            id: r.id,
            personId: r.personId,
            noteId: r.noteId,
            dueAt: new Date(r.dueAt).toISOString(),
            message: r.message,
            recurrence: r.recurrence,
            recurrenceDays: r.recurrenceDays,
          },
          r.id,
        ).catch(ignore);
      },
    }),
    [qc],
  );
}

/* ---------- v1-compatible hooks (same defaults, unscoped) ---------- */

export function useCreateReminder() {
  const m = useMutation<ReminderWithPerson, Error, CreateReminderVars>({ mutationKey: REMINDER_MUT.create });
  return { ...m, mutate: (input: ReminderInput, opts?: Parameters<typeof m.mutate>[1]) => m.mutate({ ...input, id: input.id ?? crypto.randomUUID() }, opts) };
}

/** done | snooze {days} | reschedule {dueAt} | update {…} */
export function useReminderAction() {
  return useMutation<ReminderWithPerson, Error, ReminderActionVars>({ mutationKey: REMINDER_MUT.action });
}

export function useDeleteReminder() {
  return useMutation<unknown, Error, DeleteReminderVars>({ mutationKey: REMINDER_MUT.delete });
}
