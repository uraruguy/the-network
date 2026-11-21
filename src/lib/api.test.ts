import { afterEach, describe, expect, it, vi } from "vitest";
import { api, responseTimeout } from "./api";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe("responseTimeout", () => {
  it("aborts with a TimeoutError once the time is up, unless the response started", async () => {
    const late = responseTimeout(undefined, 10);
    const early = responseTimeout(undefined, 10);
    early.started();
    expect(late.signal.aborted).toBe(false);
    await sleep(40);
    expect(late.signal.aborted).toBe(true);
    expect((late.signal.reason as DOMException).name).toBe("TimeoutError");
    expect(early.signal.aborted).toBe(false);
  });

  it("follows the caller's signal, also one aborted already, after the response started too", () => {
    const ctrl = new AbortController();
    const t = responseTimeout(ctrl.signal, 1000);
    t.started();
    expect(t.signal.aborted).toBe(false);
    ctrl.abort();
    expect(t.signal.aborted).toBe(true);
    expect((t.signal.reason as DOMException).name).toBe("AbortError");
    expect(responseTimeout(ctrl.signal, 1000).signal.aborted).toBe(true);
  });
});

describe("api", () => {
  afterEach(() => vi.restoreAllMocks());

  it("gives reads the caller's signal (with the timeout); writes get none", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("{}", { status: 200 }));
    const ctrl = new AbortController();
    await api.get("/api/people", { signal: ctrl.signal });
    const signal = fetchMock.mock.calls[0]![1]!.signal!;
    expect(signal.aborted).toBe(false);
    ctrl.abort();
    expect(signal.aborted).toBe(true);
    await api.patch("/api/people/1", {});
    expect(fetchMock.mock.calls[1]![1]!.signal).toBeUndefined();
  });
});
