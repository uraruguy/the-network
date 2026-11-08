import { describe, expect, it } from "vitest";
import { MAX_REBUILDS, planRebuild, REBUILD_WINDOW_MS } from "./recovery";

describe("planRebuild", () => {
  it("rebuilds straight away the first time, then backs off", () => {
    const first = planRebuild([], 1_000);
    expect(first).toEqual({ ok: true, delay: 0, history: [1_000] });
    const second = planRebuild(first.history, 5_000);
    expect(second).toMatchObject({ ok: true, delay: 1500, history: [1_000, 5_000] });
    const third = planRebuild(second.history, 9_000);
    expect(third).toMatchObject({ ok: true, delay: 4000, history: [1_000, 5_000, 9_000] });
  });

  it("gives up once the budget is spent within the window", () => {
    const history = Array.from({ length: MAX_REBUILDS }, (_, i) => i * 1000);
    expect(planRebuild(history, 10_000)).toEqual({ ok: false, history });
  });

  it("forgets rebuilds older than the window", () => {
    const old = Array.from({ length: MAX_REBUILDS }, (_, i) => i * 1000);
    const now = REBUILD_WINDOW_MS + 5_000;
    expect(planRebuild(old, now)).toEqual({ ok: true, delay: 0, history: [now] });
  });
});
