// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { bulkBatches } from "./bulk";
import { LIST_MEMORY_TTL, listReturnHref, readListMemory, rememberListPosition, resetListMemory, restoreScrollTop, sameListHref, saveListPosition } from "./list-memory";

const win = (path: string, scrollY: number) => ({ location: { pathname: path.split("?")[0]!, search: path.includes("?") ? `?${path.split("?")[1]}` : "" }, scrollY }) as unknown as Window;

describe("list memory", () => {
  beforeEach(() => resetListMemory());

  it("remembers the list URL with its filters, the offset and the person", () => {
    rememberListPosition("p1", win("/people?cat=abc&sort=name", 1234.6), 1000);
    expect(readListMemory(1000)).toEqual({ href: "/people?cat=abc&sort=name", scrollY: 1235, personId: "p1", at: 1000 });
    expect(listReturnHref(1000)).toBe("/people?cat=abc&sort=name");
  });

  it("survives a reload of the module through sessionStorage, and expires", () => {
    rememberListPosition("p2", win("/people", 50), 5000);
    expect(JSON.parse(sessionStorage.getItem("network:people-list")!)).toMatchObject({ personId: "p2" });
    expect(readListMemory(5000 + LIST_MEMORY_TTL + 1)).toBeNull();
    expect(listReturnHref(5000 + LIST_MEMORY_TTL + 1)).toBe("/people");
  });

  it("saves a position without anyone opened (leaving the list for another tab)", () => {
    saveListPosition({ href: "/people?act=x", scrollY: 640, personId: null }, 7);
    expect(readListMemory(7)).toEqual({ href: "/people?act=x", scrollY: 640, personId: null, at: 7 });
  });

  it("compares list URLs regardless of parameter order and encoding", () => {
    expect(sameListHref("/people?cat=a&sort=name", "/people?sort=name&cat=a")).toBe(true);
    expect(sameListHref("/people?q=%C5%BDan", "/people?q=Žan")).toBe(true);
    expect(sameListHref("/people?cat=a", "/people?cat=b")).toBe(false);
    expect(sameListHref("/people", "/people?cat=a")).toBe(false);
  });

  it("never returns to a non-People URL", () => {
    rememberListPosition("p3", win("/globe?cat=x", 10), 1);
    expect(listReturnHref(1)).toBe("/people");
  });
});

describe("restoreScrollTop", () => {
  const base = { rowHeight: 68, listTop: 300, rowCount: 400, viewportHeight: 900, insetTop: 120, insetBottom: 90, documentHeight: 300 + 400 * 68 + 200 };

  it("keeps the saved offset while the last-opened row is visible there", () => {
    // Row 40 sits at 300 + 2720 = 3020; with scrollY 2700 the visible band is 2820..3510.
    expect(restoreScrollTop({ ...base, savedScrollY: 2700, index: 40 })).toBe(2700);
  });

  it("centres the row when rows above it changed and it would be off screen", () => {
    const top = restoreScrollTop({ ...base, savedScrollY: 100, index: 40 });
    const rowTop = 300 + 40 * 68;
    const visibleMiddle = top + 120 + (900 - 120 - 90) / 2;
    expect(Math.abs(rowTop + 34 - visibleMiddle)).toBeLessThanOrEqual(1);
  });

  it("keeps the saved offset when the person is gone, so their neighbours fill the spot", () => {
    expect(restoreScrollTop({ ...base, savedScrollY: 2700, index: -1 })).toBe(2700);
  });

  it("clamps to the document", () => {
    expect(restoreScrollTop({ ...base, savedScrollY: 99999, index: -1 })).toBe(base.documentHeight - 900);
    expect(restoreScrollTop({ ...base, savedScrollY: 500, index: 0 })).toBe(0);
  });
});

describe("bulkBatches", () => {
  it("splits large selections and drops duplicates", () => {
    expect(bulkBatches(["a", "b", "a", "c"], 2)).toEqual([["a", "b"], ["c"]]);
    expect(bulkBatches([])).toEqual([]);
  });
});
