"use client";
import { defaultShouldDehydrateQuery, onlineManager, QueryClient, type Mutation, type Query } from "@tanstack/react-query";
import type { PersistedClient, Persister, PersistQueryClientOptions } from "@tanstack/react-query-persist-client";
import { del, get, set } from "idb-keyval";
import type { NoteDoc } from "@/lib/notes/cache";

// Bump when cached API shapes change incompatibly (v2: people index, note excerpts, activities).
// Bumping drops the whole persisted cache — including writes still queued offline — so additive
// fields (e.g. a note's `baseVersions`) don't bump it.
export const CACHE_VERSION = "v2";

/** How long a persisted cache stays usable offline. */
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24 * 14;

/** Writes to IndexedDB are coalesced: at most one serialisation of the whole cache per window. */
export const PERSIST_THROTTLE_MS = 2000;

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Data is single-user and rarely changes under us: keep it fresh-ish but serve cache instantly.
        staleTime: 30_000,
        gcTime: PERSIST_MAX_AGE, // keep 2 weeks offline
        retry: 1,
        refetchOnWindowFocus: true,
        networkMode: "offlineFirst",
      },
      mutations: {
        networkMode: "offlineFirst",
        retry: 3,
      },
    },
  });
}

/**
 * Key roots that never reach IndexedDB, whatever a query's meta says: chat transcripts, the
 * security overview, connected apps (token list), geocoder lookups and the import review (whole
 * imported notes, online-only work). Search results (`[root, "search", …]`) are volatile and
 * never persisted either.
 */
const NEVER_PERSIST = new Set(["chat", "security", "connected-apps", "cities", "import-review"]);

/** A note document holding words the server doesn't have yet (see NoteDoc): never dropped. */
const hasLocalContent = (query: Pick<Query, "queryKey" | "state">) => {
  const doc = query.queryKey[0] === "note" ? (query.state.data as NoteDoc | undefined) : undefined;
  return !!(doc?.syncPending || doc?.localOnly);
};

/**
 * Which queries reach IndexedDB: every successful query unless its key is excluded above or it
 * opts out with `meta: { persist: false }` (large, volatile or sensitive data). Entries not
 * refreshed for PERSIST_MAX_AGE are left out, so the persisted cache sheds what is no longer
 * opened (gc timers restart with every session and never get there) — but not while offline,
 * where nothing can be refreshed, and never a note with unsynced words.
 */
export function shouldPersistQuery(query: Pick<Query, "queryKey" | "meta" | "state">): boolean {
  const [root, sub] = query.queryKey;
  if (NEVER_PERSIST.has(String(root)) || sub === "search") return false;
  if (query.meta?.persist === false || !defaultShouldDehydrateQuery(query as Query)) return false;
  return Date.now() - query.state.dataUpdatedAt <= PERSIST_MAX_AGE || !onlineManager.isOnline() || hasLocalContent(query);
}

/**
 * Writes that can be sent again when their outcome is unknown (idempotent: client ids, PUTs,
 * PATCHes, deletes). Completing a follow-up is not — a repeat would skip a recurrence — and
 * neither is merging two people (online-only; a repeat 404s on the removed duplicate).
 */
export function isReplayableWrite(mutationKey: readonly unknown[] | undefined, variables: unknown): boolean {
  const [root, op] = mutationKey ?? [];
  switch (root) {
    case "people":
      return op !== "merge";
    case "notes":
    case "activities":
    case "settings":
    case "chat":
      return true;
    case "reminders":
      return op !== "action" || (variables as { action?: unknown } | undefined)?.action !== "done";
    default:
      return false;
  }
}

/**
 * Paused (offline) writes are persisted so they survive a reload — and so are replayable writes
 * still in flight, which a closing tab would otherwise lose (see `resumeInFlight`).
 */
export function shouldPersistMutation(m: Pick<Mutation, "state" | "options">): boolean {
  return m.state.isPaused || (m.state.status === "pending" && isReplayableWrite(m.options.mutationKey, m.state.variables));
}

/** Restored writes that were in flight when the page went away resume like paused ones. */
export function resumeInFlight(client: PersistedClient): PersistedClient {
  const mutations = client.clientState.mutations.map((m) => (m.state.status === "pending" && !m.state.isPaused ? { ...m, state: { ...m.state, isPaused: true } } : m));
  return { ...client, clientState: { ...client.clientState, mutations } };
}

/** Runs `fn` when the main thread is idle — after the next paint where `requestIdleCallback` is missing (Safari). */
function whenIdle(fn: () => void, timeout: number) {
  if (typeof requestIdleCallback === "function") requestIdleCallback(() => fn(), { timeout });
  else if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => setTimeout(fn, 16));
  else setTimeout(fn, 16);
}

/**
 * Resolves once the main thread goes idle after start-up — i.e. after React has hydrated every
 * Suspense boundary (each loading.tsx adds one, and they hydrate in later tasks than the root).
 * Restoring before that would let a late boundary hydrate with data the server HTML didn't have.
 */
function afterHydration(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  return new Promise((resolve) => whenIdle(resolve, 300));
}

let flushActive: (() => Promise<void>) | null = null;

/**
 * Writes the newest cache snapshot to IndexedDB right away, skipping the throttle — call on
 * pagehide / tab hidden so a just-queued save (and its `syncPending` flag) is on disk before the
 * page may be killed. No-op until the persisted cache has been restored, and when nothing changed
 * since the last write.
 */
export function flushPersistedCache(): Promise<void> {
  return flushActive?.() ?? Promise.resolve();
}

/**
 * Saves the cache to IndexedDB. Every cache change hands over a snapshot synchronously; the newest
 * is serialised at most once per PERSIST_THROTTLE_MS, and only once the main thread is idle —
 * never inside the tap or keystroke that changed the cache (stringifying the whole cache takes
 * tens of milliseconds on a phone). `flush` writes the newest snapshot at once.
 */
export function makePersister(): Persister & { flush: () => Promise<void> } {
  const key = `the-network-cache-${CACHE_VERSION}`;
  let latest: PersistedClient | null = null;
  let dirty = false;
  let scheduled = false;
  let lastWrite = -Infinity;
  const flush = async () => {
    if (!dirty || !latest) return;
    dirty = false;
    lastWrite = Date.now();
    try {
      await set(key, JSON.stringify(latest));
    } catch {
      dirty = true; // e.g. storage full: the next save or flush tries again
    }
  };
  const write = () => {
    scheduled = false;
    void flush();
  };
  flushActive = flush;
  return {
    persistClient: (client) => {
      latest = client;
      dirty = true;
      if (scheduled) return;
      scheduled = true;
      setTimeout(() => whenIdle(write, 1000), Math.max(0, lastWrite + PERSIST_THROTTLE_MS - Date.now()));
    },
    restoreClient: async () => {
      await afterHydration();
      const json = await get<string>(key);
      return json ? resumeInFlight(JSON.parse(json) as PersistedClient) : undefined;
    },
    removeClient: () => del(key),
    flush,
  };
}

/** Everything `PersistQueryClientProvider` needs besides the client. */
export function makePersistOptions(): Omit<PersistQueryClientOptions, "queryClient"> {
  return {
    persister: makePersister(),
    buster: CACHE_VERSION,
    maxAge: PERSIST_MAX_AGE,
    dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery, shouldDehydrateMutation: shouldPersistMutation },
  };
}
