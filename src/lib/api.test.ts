import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, withTimeout } from "./api";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe.each([
  ["with AbortSignal.any", true],
  ["without AbortSignal.any (Safari before 17.4)", false],
])("withTimeout %s", (_, native) => {
  const any = AbortSignal.any;
  beforeEach(() => {
    if (!native) (AbortSignal as { any?: unknown }).any = undefined;
  });
  afterEach(() => {
    AbortSignal.any = any;
  });

  it("aborts with a TimeoutError once the time is up", async () => {
    const signal = withTimeout(undefined, 10);
    expect(signal.aborted).toBe(false);
    await sleep(40);
    expect(signal.aborted).toBe(true);
    expect((signal.reason as DOMException).name).toBe("TimeoutError");
  });

  it("follows the caller's signal, also one aborted already", () => {
    const ctrl = new AbortController();
    const signal = withTimeout(ctrl.signal, 1000);
    expect(signal.aborted).toBe(false);
    ctrl.abort();
    expect(signal.aborted).toBe(true);
    expect((signal.reason as DOMException).name).toBe("AbortError");
    expect(withTimeout(ctrl.signal, 1000).aborted).toBe(true);
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
