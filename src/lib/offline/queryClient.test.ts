import { onlineManager, QueryClient, type Mutation } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { set } from "idb-keyval";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { registerChatMutations } from "@/lib/queries/chat";
import { asLastSuccess, isReplayableWrite, makePersister, PERSIST_MAX_AGE, PERSIST_THROTTLE_MS, resumeInFlight, shouldPersistMutation, shouldPersistQuery } from "./queryClient";

vi.mock("idb-keyval", () => ({ get: vi.fn(), set: vi.fn(async () => {}), del: vi.fn(async () => {}) }));

function persisted(qc: QueryClient, key: readonly unknown[]) {
  return shouldPersistQuery(qc.getQueryCache().find({ queryKey: key, exact: true })!);
}

describe("shouldPersistQuery", () => {
  it("keeps the last good data when a refetch failed, and unsynced note words even without data status", async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    qc.setQueryData(["people", "index"], [{ id: "a" }]);
    await qc.fetchQuery({ queryKey: ["people", "index"], queryFn: () => Promise.reject(new Error("timeout")), staleTime: 0 }).catch(() => {});
    expect(qc.getQueryState(["people", "index"])!.status).toBe("error");
    expect(persisted(qc, ["people", "index"])).toBe(true);
    qc.setQueryData(["note", "n1"], { id: "n1", syncPending: true }, { updatedAt: Date.now() - 2 * PERSIST_MAX_AGE });
    expect(persisted(qc, ["note", "n1"])).toBe(true);
  });

  it("stores a failed refetch as its last success", () => {
    const query = (status: "success" | "error", data: unknown) => ({ queryKey: ["k"], queryHash: "k", state: { status, data, error: status === "error" ? new Error("x") : null, fetchStatus: "fetching" } });
    const client = { timestamp: 1, buster: "", clientState: { mutations: [], queries: [query("error", [1]), query("error", undefined), query("success", [2])] } } as unknown as PersistedClient;
    const [failed, empty, ok] = asLastSuccess(client).clientState.queries;
    expect(failed!.state).toMatchObject({ status: "success", error: null, fetchStatus: "idle", data: [1] });
    expect(empty!.state.status).toBe("error");
    expect(ok).toBe(client.clientState.queries[2]);
  });

  it("persists ordinary successful queries", () => {
    const qc = new QueryClient();
    qc.setQueryData(["people", "index"], []);
    qc.setQueryData(["note", "n1"], { id: "n1" });
    expect(persisted(qc, ["people", "index"])).toBe(true);
    expect(persisted(qc, ["note", "n1"])).toBe(true);
  });

  it("never persists chat transcripts, security data, city lookups or searches — meta or not", () => {
    const qc = new QueryClient();
    for (const key of [["chat", "thread", "t1"], ["chat", "threads"], ["security", "overview"], ["connected-apps"], ["cities", "lju"], ["people", "search", {}], ["notes", "search", "q", null], ["import-review", "item", "i1"], ["import-review", "queue", "apple-notes"]]) {
      qc.setQueryData(key, { x: 1 });
      expect(persisted(qc, key)).toBe(false);
    }
  });

  it("honours meta.persist = false, also for entries created by setQueryData under chat defaults", () => {
    const qc = new QueryClient();
    registerChatMutations(qc);
    qc.setQueryData(["chat", "thread", "t2"], { messages: [] });
    expect(qc.getQueryCache().find({ queryKey: ["chat", "thread", "t2"] })!.meta).toEqual({ persist: false });
    qc.setQueryDefaults(["volatile"], { meta: { persist: false } });
    qc.setQueryData(["volatile", 1], 1);
    expect(persisted(qc, ["volatile", 1])).toBe(false);
  });

  it("sheds entries not refreshed for PERSIST_MAX_AGE — except notes with unsynced words, and while offline", () => {
    const qc = new QueryClient();
    const old = Date.now() - PERSIST_MAX_AGE - 60_000;
    qc.setQueryData(["person", "p1"], { id: "p1" }, { updatedAt: old });
    qc.setQueryData(["person", "p2"], { id: "p2" }, { updatedAt: Date.now() - PERSIST_MAX_AGE + 60_000 });
    qc.setQueryData(["note", "n1"], { id: "n1" }, { updatedAt: old });
    qc.setQueryData(["note", "n2"], { id: "n2", syncPending: true }, { updatedAt: old });
    qc.setQueryData(["note", "n3"], { id: "n3", localOnly: true }, { updatedAt: old });
    expect([["person", "p1"], ["person", "p2"], ["note", "n1"], ["note", "n2"], ["note", "n3"]].map((k) => persisted(qc, k))).toEqual([false, true, false, true, true]);
    onlineManager.setOnline(false);
    try {
      expect(persisted(qc, ["person", "p1"])).toBe(true);
    } finally {
      onlineManager.setOnline(true);
    }
  });
});

describe("makePersister", () => {
  const snapshot = (n: number) => ({ timestamp: n, buster: "v2", clientState: { queries: [], mutations: [] } }) as PersistedClient;
  const written = () => vi.mocked(set).mock.calls.map(([, json]) => (JSON.parse(json as string) as PersistedClient).timestamp);

  beforeEach(() => {
    vi.useFakeTimers();
    vi.mocked(set).mockClear();
  });
  afterEach(() => vi.useRealTimers());

  it("never serialises inside the change: the newest snapshot is written once the thread is idle", async () => {
    const p = makePersister();
    void p.persistClient(snapshot(1));
    void p.persistClient(snapshot(2));
    expect(set).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(written()).toEqual([2]);
  });

  it("writes at most once per throttle window", async () => {
    const p = makePersister();
    void p.persistClient(snapshot(1));
    await vi.advanceTimersByTimeAsync(100);
    void p.persistClient(snapshot(2));
    void p.persistClient(snapshot(3));
    await vi.advanceTimersByTimeAsync(PERSIST_THROTTLE_MS / 2);
    expect(written()).toEqual([1]);
    await vi.advanceTimersByTimeAsync(PERSIST_THROTTLE_MS);
    expect(written()).toEqual([1, 3]);
  });

  it("flush writes the newest snapshot at once, then only when something changed", async () => {
    const p = makePersister();
    await p.flush();
    expect(set).not.toHaveBeenCalled();
    void p.persistClient(snapshot(1));
    void p.flush();
    expect(written()).toEqual([1]);
    await p.flush();
    await vi.advanceTimersByTimeAsync(PERSIST_THROTTLE_MS * 2);
    expect(written()).toEqual([1]);
    void p.persistClient(snapshot(2));
    void p.flush();
    expect(written()).toEqual([1, 2]);
  });

  it("tries a failed write again on the next flush", async () => {
    const p = makePersister();
    vi.mocked(set).mockRejectedValueOnce(new Error("QuotaExceededError"));
    void p.persistClient(snapshot(1));
    await p.flush();
    await p.flush();
    expect(written()).toEqual([1, 1]);
  });
});

describe("persisting writes", () => {
  const m = (mutationKey: unknown[], state: Partial<Mutation["state"]>) => ({ options: { mutationKey }, state: { status: "pending", isPaused: false, variables: undefined, ...state } }) as unknown as Mutation;

  it("keeps paused writes, and in-flight ones that are safe to send again", () => {
    expect(shouldPersistMutation(m(["inbox", "x"], { isPaused: true }))).toBe(true);
    expect(shouldPersistMutation(m(["notes", "upsert"], { variables: { id: "n1" } }))).toBe(true);
    expect(shouldPersistMutation(m(["people", "create"], { variables: { id: "p1" } }))).toBe(true);
    expect(shouldPersistMutation(m(["notes", "upsert"], { status: "success" }))).toBe(false);
    expect(shouldPersistMutation(m(["inbox", "x"], {}))).toBe(false);
  });

  it("never replays completing a follow-up (a repeat would skip a recurrence)", () => {
    expect(isReplayableWrite(["reminders", "action"], { id: "r", action: "done" })).toBe(false);
    expect(isReplayableWrite(["reminders", "action"], { id: "r", action: "reschedule" })).toBe(true);
    expect(isReplayableWrite(["reminders", "create"], { id: "r" })).toBe(true);
    expect(isReplayableWrite(undefined, {})).toBe(false);
  });

  it("never replays or persists a merge in flight (online-only)", () => {
    expect(isReplayableWrite(["people", "merge"], { id: "a", into: "b" })).toBe(false);
    expect(isReplayableWrite(["people", "update"], { id: "a" })).toBe(true);
    expect(shouldPersistMutation(m(["people", "merge"], { variables: { id: "a", into: "b" } }))).toBe(false);
  });

  it("restores in-flight writes as paused so they resume with the rest", () => {
    const client = {
      timestamp: 1,
      buster: "v2",
      clientState: {
        queries: [],
        mutations: [
          { mutationKey: ["notes", "upsert"], state: { status: "pending", isPaused: false } },
          { mutationKey: ["people", "update"], state: { status: "pending", isPaused: true } },
        ],
      },
    } as unknown as PersistedClient;
    expect(resumeInFlight(client).clientState.mutations.map((x) => x.state.isPaused)).toEqual([true, true]);
  });
});
