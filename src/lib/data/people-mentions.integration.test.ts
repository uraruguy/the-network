/**
 * getPerson's mentions (filtered, ordered and capped in SQL) against a LOCAL Supabase database.
 * Opt-in: TEST_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres pnpm test
 * Runs inside a transaction that is rolled back; the data layer's `db` is pointed at it.
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterAll, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { getPerson, PERSON_NOTES_PAGE } from "./people";

const state = vi.hoisted(() => ({ db: null as unknown }));
vi.mock("@/lib/db", async () => ({
  schema: await import("@/lib/db/schema"),
  get db() {
    return state.db;
  },
}));

const url = process.env.TEST_DATABASE_URL;
const local = !!url && /@(127\.0\.0\.1|localhost)[:/]/.test(url);
const { people, notes, noteMentions, profiles } = schema;

class Rollback extends Error {}

describe.skipIf(!local)("getPerson mentions (local database)", () => {
  const client = local ? postgres(url!, { max: 1 }) : null;
  const tdb = client ? drizzle(client, { schema }) : null;
  afterAll(async () => {
    await client?.end();
  });

  it("returns the newest first page, skipping deleted notes and notes on deleted people", async () => {
    await tdb!
      .transaction(async (tx) => {
        state.db = tx;
        const [owner] = await tx.select({ id: profiles.id }).from(profiles).limit(1);
        if (!owner) throw new Rollback();
        const ownerId = owner.id;
        const person = async (displayName: string, deletedAt: Date | null = null) =>
          (await tx.insert(people).values({ ownerId, displayName, deletedAt }).returning({ id: people.id }))[0]!.id;
        const target = await person("Mentioned");
        const author = await person("Author");
        const gone = await person("Gone", new Date());
        const base = Date.UTC(2026, 0, 1);
        const note = async (personId: string, minutes: number, deletedAt: Date | null = null) => {
          const [n] = await tx
            .insert(notes)
            .values({ ownerId, personId, title: `t${minutes}`, contentText: "x".repeat(400), occurredAt: new Date(base + minutes * 60_000), deletedAt })
            .returning({ id: notes.id });
          await tx.insert(noteMentions).values({ ownerId, noteId: n!.id, personId: target });
          return n!.id;
        };
        for (let i = 0; i < PERSON_NOTES_PAGE + 5; i++) await note(author, i);
        await note(author, 1000, new Date());
        await note(gone, 1001);

        const detail = await getPerson(ownerId, target);
        const mentions = detail!.mentions;
        expect(mentions).toHaveLength(PERSON_NOTES_PAGE);
        expect(mentions[0]!.note.title).toBe(`t${PERSON_NOTES_PAGE + 4}`);
        expect(mentions.at(-1)!.note.title).toBe("t5");
        expect(mentions.every((m) => m.note.personId === author && m.note.personName === "Author" && m.note.excerpt.length === 280)).toBe(true);
        throw new Rollback();
      })
      .catch((e) => {
        if (!(e instanceof Rollback)) throw e;
      });
  });
});
