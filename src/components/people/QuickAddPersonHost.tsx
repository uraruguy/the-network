"use client";
/**
 * The app-wide quick-add: a tiny store, the `⌘N` / `N` shortcuts and the `?new=1` deep link,
 * mounted on every route by the app shell. The sheet itself (form, pickers) is its own chunk,
 * mounted when the browser is first idle so `⌘N` still opens it instantly.
 */
import dynamic from "next/dynamic";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useSyncExternalStore } from "react";

const QuickAddPersonSheet = dynamic(() => import("./QuickAddPersonSheet").then((m) => m.QuickAddPersonSheet), { ssr: false });

/* ------------------------------------------------------------------ */
/*  Global store: one quick-add sheet for the whole app                */
/* ------------------------------------------------------------------ */

type QuickAddState = { open: boolean; name: string; onClose: (() => void) | null };

let state: QuickAddState = { open: false, name: "", onClose: null };
let hosts = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Opens the app-wide quick-add sheet (mounted by `QuickAddPersonHost`). */
export function openQuickAdd(opts: { name?: string; onClose?: () => void } = {}) {
  state = { open: true, name: opts.name ?? "", onClose: opts.onClose ?? null };
  emit();
}

function closeQuickAdd() {
  const cb = state.onClose;
  state = { ...state, open: false, onClose: null };
  emit();
  cb?.();
}

/** Opens the sheet with `name`, or (already open) reports its close to `onClose` too. */
export function joinQuickAdd(name: string | undefined, onClose: () => void) {
  if (!state.open) openQuickAdd({ name, onClose });
  else if (!state.onClose) state = { ...state, onClose };
}

const useQuickAddState = () => useSyncExternalStore(subscribe, () => state, () => state);
export const useQuickAddHosted = () =>
  useSyncExternalStore(
    subscribe,
    () => hosts > 0,
    () => false,
  );

const isTyping = (el: EventTarget | null) => {
  const t = el as HTMLElement | null;
  return !!t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || !!t.closest?.("[contenteditable=true],[role=dialog],[role=menu],[role=listbox]"));
};

/**
 * Mount once inside the app shell: the quick-add sheet, the `⌘N` / `N` shortcuts and the
 * `?new=1` deep link (PWA shortcut "Add person").
 */
export function QuickAddPersonHost() {
  return (
    <Suspense fallback={null}>
      <Host />
    </Suspense>
  );
}

function Host() {
  const s = useQuickAddState();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  // Mounted (closed) once the browser is idle, or right away when something opens it first.
  const [sheet, setSheet] = useState(false);
  if (s.open && !sheet) setSheet(true);

  useEffect(() => {
    hosts += 1;
    emit();
    return () => {
      hosts -= 1;
      emit();
    };
  }, []);

  useEffect(() => {
    const show = () => setSheet(true);
    if (typeof requestIdleCallback === "function") {
      const id = requestIdleCallback(show, { timeout: 3000 });
      return () => cancelIdleCallback(id);
    }
    const t = setTimeout(show, 1500);
    return () => clearTimeout(t);
  }, []);

  // Pages that give ⌘N its own meaning (person and note pages: a new note) handle it in the
  // capture phase and preventDefault; handled events are skipped here, so one press = one action.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.repeat || e.altKey || e.shiftKey) return;
      const cmdN = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n";
      const bareN = !e.metaKey && !e.ctrlKey && e.key.toLowerCase() === "n" && !isTyping(e.target) && !isTyping(document.activeElement);
      if (!cmdN && !bareN) return;
      e.preventDefault();
      if (!state.open) openQuickAdd();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const deepLink = params.get("new") === "1";
  useEffect(() => {
    if (!deepLink) return;
    if (!state.open) openQuickAdd();
    const next = new URLSearchParams(params);
    next.delete("new");
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`, { scroll: false });
  }, [deepLink, params, pathname, router]);

  return sheet ? <QuickAddPersonSheet open={s.open} onOpenChange={(o) => (o ? openQuickAdd() : closeQuickAdd())} initialName={s.name} /> : null;
}
