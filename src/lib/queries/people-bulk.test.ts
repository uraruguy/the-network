import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { toast } from "@/components/ui/Toast";
import type { DeletedPerson } from "@/lib/data/people";
import { keys } from "./keys";
import { personWrites, registerPeopleMutations } from "./people";
import type { PersonDetailApi, PersonIndexRow } from "./types";

/** Bulk remove / restore (People → Select, Recently deleted): one request, instant cache, undo. */

vi.mock("@/components/ui/Toast", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), undo: vi.fn(), success: vi.fn() }) }));

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const C = "33333333-3333-4333-8333-333333333333";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const row = (id: string, displayName: string) => ({ id, displayName, avatarUrl: null, headline: null, company: null, categoryIds: [], activityIds: [], tagIds: [] }) as unknown as PersonIndexRow;
const detail = (id: string, displayName: string) => ({ ...row(id, displayName), notes: [], notesCount: 0, reminders: [], homeLocation: null }) as unknown as PersonDetailApi;
const deleted = (id: string, displayName: string): DeletedPerson => ({ id, displayName, avatarUrl: null, headline: null, company: null, deletedAt: "2026-10-27T10:00:00.000Z", notesCount: 2, mergedInto: null });
const ids = () => qcIndex().map((p) => p.id);

let qc: QueryClient;
const qcIndex = () => qc.getQueryData<PersonIndexRow[]>(keys.peopleIndex()) ?? [];

describe("bulk person writes", () => {
  type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  let fetchMock: ReturnType<typeof vi.fn<Fetch>>;

  beforeEach(() => {
    qc = new QueryClient();
    registerPeopleMutations(qc);
    qc.setQueryData(keys.peopleIndex(), [row(A, "Ana"), row(B, "Matevž"), row(C, "Cene")]);
    qc.setQueryData(keys.person(A), detail(A, "Ana"));
    qc.setQueryData(keys.person(B), detail(B, "Matevž"));
    qc.setQueryData(keys.reminders(), [
      { id: "r1", personId: A },
      { id: "r2", personId: C },
    ]);
    fetchMock = vi.fn<Fetch>(async (_url, init) => {
      const body = JSON.parse(String(init?.body)) as { action: string; ids: string[] };
      return json(200, { action: body.action, ids: body.ids });
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.mocked(toast.error).mockClear();
    qc.clear();
  });

  it("removes several people in one request and drops them (and their follow-ups) from the lists at once", async () => {
    personWrites(qc).removeMany([A, B, A]);
    // Optimistic: gone before the request settles.
    expect(ids()).toEqual([C]);
    expect(qc.getQueryData<{ personId: string }[]>(keys.reminders())!.map((r) => r.personId)).toEqual([C]);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect([url, init?.method, JSON.parse(String(init?.body))]).toEqual(["/api/people/bulk", "POST", { action: "delete", ids: [A, B] }]);
  });

  it("undo puts cached profiles straight back, restores in one request, and leaves Recently deleted", async () => {
    qc.setQueryData(keys.deletedPeople(), [deleted(A, "Ana"), deleted(B, "Matevž")]);
    const writes = personWrites(qc);
    writes.removeMany([A, B]);
    const back = await writes.restoreMany([A, B]);
    expect(back).toEqual([A, B]);
    expect(new Set(ids())).toEqual(new Set([A, B, C]));
    expect(qc.getQueryData<DeletedPerson[]>(keys.deletedPeople())).toEqual([]);
    // Same scope: the restore went out after the removal it undoes.
    expect(fetchMock.mock.calls.map(([, init]) => (JSON.parse(String(init?.body)) as { action: string }).action)).toEqual(["delete", "restore"]);
  });

  it("restoring one person from Recently deleted takes them off that list at once", async () => {
    qc.setQueryData(keys.deletedPeople(), [deleted(A, "Ana"), deleted(B, "Matevž")]);
    fetchMock.mockImplementation(async () => json(200, detail(B, "Matevž")));
    await personWrites(qc).restore(B);
    expect(qc.getQueryData<DeletedPerson[]>(keys.deletedPeople())!.map((p) => p.id)).toEqual([A]);
  });

  it("a failed bulk removal says so and refetches the list", async () => {
    fetchMock.mockImplementation(async () => json(500, { error: "internal", message: "boom" }));
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    personWrites(qc).removeMany([A]);
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Couldn’t remove these people", expect.anything()));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.peopleIndex() });
  });
});
