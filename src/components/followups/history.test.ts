import { describe, expect, it } from "vitest";
import { historyCount, historyMeta } from "./history";

const now = new Date(2026, 10, 8, 12).getTime();
const at = (m: number, d: number, h = 9) => new Date(2026, m, d, h).toISOString();

describe("historyMeta", () => {
  it("says when it was done, and nothing more for an on-time one-off done in the app", () => {
    expect(historyMeta({ completedAt: at(10, 3, 18), dueAt: at(10, 3), recurrence: "none", via: "app" }, now)).toEqual(["Done Tue, 3 Nov"]);
  });
  it("adds the due date when it was another day, early or late", () => {
    expect(historyMeta({ completedAt: at(10, 3), dueAt: at(10, 1), recurrence: "none", via: "app" }, now)).toEqual(["Done Tue, 3 Nov", "due Sun, 1 Nov"]);
    expect(historyMeta({ completedAt: at(10, 3), dueAt: at(10, 5), recurrence: "none", via: null }, now)).toEqual(["Done Tue, 3 Nov", "due Thu, 5 Nov"]);
  });
  it("names the repeat and where it was done", () => {
    expect(historyMeta({ completedAt: at(10, 3), dueAt: at(10, 3), recurrence: "monthly", via: "email" }, now)).toEqual(["Done Tue, 3 Nov", "every month", "from the e-mail"]);
    expect(historyMeta({ completedAt: at(10, 3), dueAt: at(10, 3), recurrence: "custom_days", recurrenceDays: 14, via: "assistant" }, now)).toEqual([
      "Done Tue, 3 Nov",
      "every 2 weeks",
      "by the assistant",
    ]);
  });
  it("shows the year for another year", () => {
    expect(historyMeta({ completedAt: new Date(2025, 0, 6, 9).toISOString(), dueAt: new Date(2025, 0, 6, 9).toISOString(), recurrence: "none", via: null }, now)).toEqual([
      "Done Mon, 6 Jan 2025",
    ]);
  });
});

describe("historyCount", () => {
  it("counts", () => {
    expect(historyCount(1)).toBe("1 done");
    expect(historyCount(1200)).toBe("1,200 done");
  });
});
