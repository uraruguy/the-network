import { QueryClient, QueryObserver } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keys } from "./keys";
import { personDetailQuery, personWrites, prefetchPerson, registerPeopleMutations } from "./people";
import type { PersonDetailApi, PersonIndexRow } from "./types";

/** Person reads around queued writes, and what a confirmed save refreshes. */

vi.mock("@/components/ui/Toast", () => ({ toast: Object.assign(vi.fn(), { error: vi.fn(), undo: vi.fn(), success: vi.fn() }) }));

const A = "11111111-1111-4111-8111-111111111111";
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
const detail = (displayName: string) =>
  ({ id: A, displayName, avatarUrl: null, headline: null, company: null, categoryIds: [], activityIds: [], tagIds: [], tags: [], notes: [], notesCount: 0, reminders: [], homeLocation: null }) as unknown as PersonDetailApi;

type Fetch = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
let qc: QueryClient;
let fetchMock: ReturnType<typeof vi.fn<Fetch>>;
const gets = () => fetchMock.mock.calls.filter(([, init]) => (init?.method ?? "GET") === "GET").length;
const invalidated = (key: readonly unknown[]) => qc.getQueryState(key)?.isInvalidated;

beforeEach(() => {
  qc = new QueryClient();
  registerPeopleMutations(qc);
  qc.setQueryData(keys.peopleIndex(), [{ id: A, displayName: "Ana" }] as PersonIndexRow[]);
  qc.setQueryData(keys.person(A), detail("Ana"));
  qc.setQueryData(keys.tags(), []);
  qc.setQueryData(keys.taxonomy(), {});
  fetchMock = vi.fn<Fetch>(async () => json(200, detail("Server")));
  vi.spyOn(globalThis, "fetch").mockImplementation(fetchMock);
});
afterEach(() => {
  vi.restoreAllMocks();
  qc.clear();
});

describe("person detail while a write is queued", () => {
  it("serves the cached (optimistic) detail instead of the server's, and isn't prefetched", async () => {
    fetchMock.mockImplementation(() => new Promise(() => {})); // the PATCH never lands (offline)
    personWrites(qc).update(A, { displayName: "Ana N." });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
    const read = await qc.fetchQuery({ ...personDetailQuery(A), staleTime: 0 });
    expect(read.displayName).toBe("Ana N.");
    prefetchPerson(qc, A);
    expect(gets()).toBe(0);
  });

  it("fetches the server's detail otherwise", async () => {
    const read = await qc.fetchQuery({ ...personDetailQuery(A), staleTime: 0 });
    expect(read.displayName).toBe("Server");
    expect(gets()).toBe(1);
  });
});

describe("after a person save", () => {
  it("keeps the index (the answer is already in it) and taxonomy lists the save didn't touch", async () => {
    personWrites(qc).update(A, { displayName: "Ana N." });
    await vi.waitFor(() => expect(qc.isMutating()).toBe(0));
    expect(qc.getQueryData<PersonIndexRow[]>(keys.peopleIndex())![0]!.displayName).toBe("Server");
    expect([invalidated(keys.peopleIndex()), invalidated(keys.tags()), invalidated(keys.taxonomy()), invalidated(keys.person(A))]).toEqual([false, false, false, true]);
  });

  it("refreshes tags when the save changed them, and everything when it failed", async () => {
    personWrites(qc).update(A, { tagNames: ["vc"] });
    await vi.waitFor(() => expect(qc.isMutating()).toBe(0));
    expect([invalidated(keys.peopleIndex()), invalidated(keys.tags()), invalidated(keys.taxonomy())]).toEqual([false, true, true]);

    qc.setQueryData(keys.tags(), []);
    fetchMock.mockImplementation(async () => json(422, { error: "invalid", message: "nope" }));
    personWrites(qc).update(A, { displayName: "" });
    await vi.waitFor(() => expect(qc.isMutating()).toBe(0));
    expect([invalidated(keys.peopleIndex()), invalidated(keys.tags())]).toEqual([true, true]);
  });
});

describe("review regressions", () => {
  it("rolls a rejected edit back on screen (the failed write no longer guards the detail)", async () => {
    const unsub = new QueryObserver(qc, { ...personDetailQuery(A), staleTime: 30_000 }).subscribe(() => {});
    let fail!: (r: Response) => void;
    fetchMock.mockImplementation((_u, init) => ((init?.method ?? "GET") === "GET" ? Promise.resolve(json(200, detail("Ana"))) : new Promise((r) => (fail = r))));
    personWrites(qc).update(A, { displayName: "Rejected" });
    await vi.waitFor(() => expect(qc.getQueryData<PersonDetailApi>(keys.person(A))!.displayName).toBe("Rejected"));
    fail(json(422, { error: "invalid", message: "nope" }));
    await vi.waitFor(() => expect(qc.getQueryData<PersonDetailApi>(keys.person(A))!.displayName).toBe("Ana"));
    expect(gets()).toBe(1);
    unsub();
  });

  it("refetches the index when a read of it was in flight while writes settled one after another", async () => {
    const B = "22222222-2222-4222-8222-222222222222";
    qc.setQueryData(keys.person(B), { ...detail("Bo"), id: B });
    const gate: Record<string, (r: Response) => void> = {};
    let indexGets = 0;
    fetchMock.mockImplementation((u, init) => {
      const url = String(u);
      if ((init?.method ?? "GET") === "GET" && url === "/api/people") return new Promise((r) => (gate[`idx${++indexGets}`] = r));
      return new Promise((r) => (gate[url] = r));
    });
    const unsub = new QueryObserver(qc, { queryKey: keys.peopleIndex(), queryFn: () => fetch("/api/people").then((r) => r.json()), staleTime: 5 * 60_000 }).subscribe(() => {});
    void qc.invalidateQueries({ queryKey: keys.peopleIndex() });
    await vi.waitFor(() => expect(gate.idx1).toBeTruthy());
    personWrites(qc).update(A, { displayName: "Ana N." });
    personWrites(qc).update(B, { displayName: "Bo N." });
    await vi.waitFor(() => expect(gate[`/api/people/${A}`] && gate[`/api/people/${B}`]).toBeTruthy());
    gate[`/api/people/${A}`]!(json(200, detail("Ana N.")));
    await vi.waitFor(() => expect(qc.isMutating()).toBe(1));
    gate.idx1!(json(200, [{ id: A, displayName: "Ana" }]));
    gate[`/api/people/${B}`]!(json(200, { ...detail("Bo N."), id: B }));
    await vi.waitFor(() => expect(indexGets).toBe(2));
    unsub();
  });
});
