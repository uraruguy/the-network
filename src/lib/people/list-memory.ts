/**
 * Where you were in the People list when you opened someone: the list URL (filters, search, sort),
 * the scroll offset and the person. Coming back (the back button, after an edit, after removing
 * them) puts the list where you left it and marks the person you last opened. Kept in memory and
 * mirrored to sessionStorage, so it survives a reload of the profile but not a new tab.
 */
export type ListMemory = { href: string; scrollY: number; personId: string | null; at: number };

const KEY = "network:people-list";
/** Older positions are stale: the list has moved on, start at the top. */
export const LIST_MEMORY_TTL = 2 * 60 * 60_000;

let memory: ListMemory | null | undefined;

/** Saves a list position (the list itself calls this when it unmounts, with what it tracked). */
export function saveListPosition(m: { href: string; scrollY: number; personId: string | null }, now = Date.now()): void {
  memory = { href: m.href, scrollY: Math.max(0, Math.round(m.scrollY)), personId: m.personId, at: now };
  try {
    sessionStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    // Private mode / storage off: the in-memory copy still covers this tab.
  }
}

/** Opening someone from the list: remember the list as it is right now, and who was opened. */
export function rememberListPosition(personId: string, win: Pick<Window, "location" | "scrollY"> = window, now = Date.now()): void {
  saveListPosition({ href: win.location.pathname + win.location.search, scrollY: win.scrollY, personId }, now);
}

/** Same list? Compares path and query parameters, ignoring their order and encoding. */
export function sameListHref(a: string, b: string): boolean {
  const norm = (h: string) => {
    const [path, query = ""] = h.split("?");
    const params = [...new URLSearchParams(query)].sort(([x], [y]) => x.localeCompare(y));
    return `${path}?${new URLSearchParams(params).toString()}`;
  };
  return norm(a) === norm(b);
}

export function readListMemory(now = Date.now()): ListMemory | null {
  if (memory === undefined) {
    try {
      const raw = sessionStorage.getItem(KEY);
      memory = raw ? (JSON.parse(raw) as ListMemory) : null;
    } catch {
      memory = null;
    }
  }
  return memory && now - memory.at < LIST_MEMORY_TTL ? memory : null;
}

/** The list URL to return to after leaving a profile (falls back to /people). */
export function listReturnHref(now = Date.now()): string {
  const m = readListMemory(now);
  return m?.href.startsWith("/people") ? m.href : "/people";
}

/** Test helper: forget everything (memory and storage). */
export function resetListMemory(): void {
  memory = undefined;
  try {
    sessionStorage.removeItem(KEY);
  } catch {}
}

/**
 * The window scroll offset to restore. Keeps the saved offset when the last-opened row is still
 * fully visible there (rows above it may have changed); otherwise centres that row. When the
 * person is gone (removed), the saved offset shows the people that took their place. Pure.
 */
export function restoreScrollTop(o: {
  savedScrollY: number;
  /** Index of the last-opened person in the current rows, -1 when they're gone. */
  index: number;
  rowHeight: number;
  /** Document offset of the list's first row. */
  listTop: number;
  rowCount: number;
  viewportHeight: number;
  /** Height covered at the top by sticky chrome (search + filters). */
  insetTop: number;
  /** Height covered at the bottom (tab bar). */
  insetBottom: number;
  documentHeight: number;
}): number {
  const maxTop = Math.max(0, o.documentHeight - o.viewportHeight);
  const clamp = (v: number) => Math.round(Math.min(maxTop, Math.max(0, v)));
  if (o.index < 0 || o.index >= o.rowCount) return clamp(o.savedScrollY);
  const rowTop = o.listTop + o.index * o.rowHeight;
  const visibleTop = o.savedScrollY + o.insetTop;
  const visibleBottom = o.savedScrollY + o.viewportHeight - o.insetBottom;
  if (rowTop >= visibleTop && rowTop + o.rowHeight <= visibleBottom) return clamp(o.savedScrollY);
  const visibleHeight = o.viewportHeight - o.insetTop - o.insetBottom;
  return clamp(rowTop - o.insetTop - (visibleHeight - o.rowHeight) / 2);
}
