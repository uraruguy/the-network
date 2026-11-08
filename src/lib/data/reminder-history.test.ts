import { readFileSync } from "node:fs";
import { afterAll, describe, expect, it, vi } from "vitest";

/** Opt-in DB checks run against the LOCAL database only (TEST_DATABASE_URL, like test/db.integration.test.ts). */
const local = vi.hoisted(() => {
  const url = process.env.TEST_DATABASE_URL;
  const ok = !!url && /@(127\.0\.0\.1|localhost)[:/]/.test(url);
  if (ok) process.env.DATABASE_URL = url;
  return ok;
});

import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { reminderInput } from "@/lib/schemas";
import { getPerson } from "./people";
import { completeReminder, createReminder, deleteHistoryEntry, linkHistoryNote, listHistory, reopenReminder } from "./reminders";

describe.skipIf(!local)("follow-up history (local database)", () => {
  const cleanup: (() => Promise<unknown>)[] = [];
  afterAll(async () => {
    for (const fn of cleanup.reverse()) await fn();
  });

  async function setup(tag: string) {
    const [owner] = await db.execute<{ id: string }>(sql`select id from profiles limit 1`);
    if (!owner) return null;
    const [person] = await db.execute<{ id: string }>(sql`insert into people (owner_id, display_name) values (${owner.id}, ${`History ${tag}`}) returning id`);
    cleanup.push(() => db.execute(sql`delete from people where owner_id = ${owner.id} and id = ${person!.id}`));
    const note = async (text: string) => {
      const [n] = await db.execute<{ id: string }>(
        sql`insert into notes (owner_id, person_id, content_md, content_text, kind) values (${owner.id}, ${person!.id}, ${text}, ${text}, 'message') returning id`,
      );
      return n!.id;
    };
    const reminder = async (extra: Record<string, unknown> = {}) =>
      (await createReminder(owner.id, reminderInput.parse({ personId: person!.id, dueAt: "2026-11-01T09:00:00.000Z", message: "Send her the deck", ...extra })))!;
    return { ownerId: owner.id, personId: person!.id, note, reminder };
  }

  it("records a completion once, with its note, and the profile shows it", async () => {
    const s = await setup(`a${Date.now()}`);
    if (!s) return;
    const r = await s.reminder();
    const noteId = await s.note("Sent the deck, she replies next week");
    const completionId = crypto.randomUUID();

    const done = await completeReminder(s.ownerId, r.id, { completionId, noteId, via: "app" });
    expect(done?.status).toBe("done");
    // A replay of the same completion (offline queue) changes nothing, and neither does
    // completing it again from elsewhere (assistant, e-mail).
    await completeReminder(s.ownerId, r.id, { completionId, noteId, via: "app" });
    await completeReminder(s.ownerId, r.id, { completionId: crypto.randomUUID(), via: "assistant" });

    const history = await listHistory(s.ownerId, s.personId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ id: completionId, reminderId: r.id, message: "Send her the deck", via: "app", recurrence: "none" });
    expect(history[0]!.note).toMatchObject({ id: noteId, kind: "message", excerpt: "Sent the deck, she replies next week" });
    expect(new Date(history[0]!.dueAt).toISOString()).toBe("2026-11-01T09:00:00.000Z");

    const p = await getPerson(s.ownerId, s.personId);
    expect(p?.historyCount).toBe(1);
    expect(p?.history.map((h) => h.id)).toEqual([completionId]);
    expect(p?.reminders).toEqual([]);
    expect(p?.lastInteractionAt).not.toBeNull();
  });

  it("undo re-opens the follow-up and drops its entry", async () => {
    const s = await setup(`b${Date.now()}`);
    if (!s) return;
    const r = await s.reminder();
    const completionId = crypto.randomUUID();
    await completeReminder(s.ownerId, r.id, { completionId });
    const reopened = await reopenReminder(s.ownerId, r.id, new Date("2026-11-01T09:00:00.000Z"), completionId);
    expect(reopened).toMatchObject({ status: "pending", doneAt: null });
    expect(await listHistory(s.ownerId, s.personId)).toEqual([]);
    expect((await getPerson(s.ownerId, s.personId))?.reminders.map((x) => x.id)).toEqual([r.id]);
  });

  it("keeps every occurrence of a repeating follow-up, which stays open", async () => {
    const s = await setup(`c${Date.now()}`);
    if (!s) return;
    const r = await s.reminder({ recurrence: "monthly", message: "Monthly call" });
    await completeReminder(s.ownerId, r.id, { completionId: crypto.randomUUID(), via: "email" });
    const second = await completeReminder(s.ownerId, r.id, { completionId: crypto.randomUUID(), via: "assistant" });
    expect(second?.status).toBe("pending");
    const history = await listHistory(s.ownerId, s.personId);
    expect(history).toHaveLength(2);
    expect(history.map((h) => h.via)).toEqual(["assistant", "email"]);
    expect(history.every((h) => h.recurrence === "monthly" && h.reminderId === r.id)).toBe(true);
    // The second completion remembers the date the first one rolled the reminder to.
    expect(+new Date(history[0]!.dueAt)).toBeGreaterThan(+new Date(history[1]!.dueAt));
  });

  it("links a note written later, hides a deleted note, and removes entries", async () => {
    const s = await setup(`d${Date.now()}`);
    if (!s) return;
    const r = await s.reminder();
    const completionId = crypto.randomUUID();
    await completeReminder(s.ownerId, r.id, { completionId });
    expect((await listHistory(s.ownerId, s.personId))[0]!.note).toBeNull();

    const noteId = await s.note("Called instead");
    expect(await linkHistoryNote(s.ownerId, completionId, noteId)).toEqual({ id: completionId, noteId });
    expect((await listHistory(s.ownerId, s.personId))[0]!.note?.id).toBe(noteId);
    // Another owner's (or a missing) note isn't linked.
    expect(await linkHistoryNote(s.ownerId, completionId, crypto.randomUUID())).toBeNull();

    await db.execute(sql`update notes set deleted_at = now() where id = ${noteId}`);
    expect((await listHistory(s.ownerId, s.personId))[0]!.note).toBeNull();

    expect(await deleteHistoryEntry(s.ownerId, completionId)).toBe(true);
    expect(await deleteHistoryEntry(s.ownerId, completionId)).toBe(false);
    expect((await getPerson(s.ownerId, s.personId))?.historyCount).toBe(0);
  });

  it("the migration re-runs cleanly and turns done one-offs into history once", async () => {
    const s = await setup(`e${Date.now()}`);
    if (!s) return;
    const r = await s.reminder({ message: "Done before history existed" });
    await db.execute(sql`update reminders set status = 'done', done_at = '2026-10-02T10:00:00Z' where id = ${r.id}`);
    const migration = readFileSync(`${process.cwd()}/supabase/migrations/20261108000000_reminder_completions.sql`, "utf8");
    await db.execute(sql.raw(migration));
    await db.execute(sql.raw(migration));
    const history = await listHistory(s.ownerId, s.personId);
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({ reminderId: r.id, message: "Done before history existed", via: null });
    expect(new Date(history[0]!.completedAt).toISOString()).toBe("2026-10-02T10:00:00.000Z");
  });
});
