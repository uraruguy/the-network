/**
 * Tiny JSON client for the app's own API. Errors arrive as `{ error: code, message }` and are
 * thrown as `ApiError` (with the whole body in `data`, e.g. the current note of a 409). A 401
 * means the session is gone (`unauthenticated`) or the passkey step is pending (`mfa_required`):
 * we navigate to the right sign-in step and keep every cache intact, so nothing written offline
 * is lost.
 */
export class ApiError extends Error {
  constructor(
    public status: number,
    /** Machine-readable code, e.g. "not_found", "mfa_required". */
    public code: string,
    message: string,
    /** The parsed error body. */
    public data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

let redirecting = false;

function goToSignIn(code: string) {
  if (typeof window === "undefined" || redirecting) return;
  const here = window.location.pathname + window.location.search;
  if (here.startsWith("/login")) return;
  redirecting = true;
  const step = code === "mfa_required" ? "/login/verify" : "/login";
  // A full navigation on purpose: this runs outside React (no router here) and the sign-in pages
  // must load fresh. The query cache lives in IndexedDB and survives it.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(`${step}?next=${encodeURIComponent(here)}`);
}

/** Browsers cap the bodies of in-flight keepalive requests at 64 KiB in total. */
const KEEPALIVE_MAX_BYTES = 60_000;
/** UTF-8 never takes fewer bytes than UTF-16 code units, so the length check is a cheap early out. */
const fitsKeepalive = (s: string | undefined) => !s || (s.length <= KEEPALIVE_MAX_BYTES && new TextEncoder().encode(s).length <= KEEPALIVE_MAX_BYTES);

export type RequestOptions = {
  /**
   * Let the request outlive the page (a save on pagehide). Ignored for bodies over the keepalive
   * limit — those still go out normally and are replayed from the persisted queue if cut off.
   */
  keepalive?: boolean;
};

export type GetOptions = {
  /** Aborts the read, e.g. TanStack's query `signal` (cancelled when no screen needs it any more). */
  signal?: AbortSignal;
};

/**
 * Reads give up after this long: on a connection that is up but passes nothing ("lie-fi") a
 * screen would otherwise wait forever. The query then retries or pauses like after any network
 * error. Writes have no timeout: their replay rules (lib/offline/queryClient) decide.
 */
export const GET_TIMEOUT_MS = 15_000;

/** `signal` combined with a timeout. Safari before 17.4 lacks `AbortSignal.any`, older ones `AbortSignal.timeout`. */
export function withTimeout(signal: AbortSignal | undefined, ms: number): AbortSignal {
  if (typeof AbortSignal.any === "function" && typeof AbortSignal.timeout === "function") {
    return signal ? AbortSignal.any([signal, AbortSignal.timeout(ms)]) : AbortSignal.timeout(ms);
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new DOMException("The request timed out.", "TimeoutError")), ms);
  const cancel = () => {
    clearTimeout(timer);
    ctrl.abort(signal?.reason);
  };
  if (signal?.aborted) cancel();
  else signal?.addEventListener("abort", cancel, { once: true });
  return ctrl.signal;
}

async function request<T>(method: string, path: string, body?: unknown, opts: RequestOptions & { signal?: AbortSignal } = {}): Promise<T> {
  const json = body !== undefined ? JSON.stringify(body) : undefined;
  const res = await fetch(path, {
    method,
    headers: json !== undefined ? { "content-type": "application/json" } : undefined,
    body: json,
    credentials: "same-origin",
    keepalive: !!opts.keepalive && fitsKeepalive(json),
    signal: opts.signal,
  });
  if (!res.ok) {
    let code = "error";
    let message = res.statusText || `HTTP ${res.status}`;
    let data: unknown;
    try {
      data = await res.json();
      const d = data as { error?: string; message?: string };
      if (d.error) code = d.error;
      message = d.message ?? d.error ?? message;
    } catch {}
    if (res.status === 401) goToSignIn(code === "mfa_required" ? code : "unauthenticated");
    throw new ApiError(res.status, code, message, data);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts: GetOptions = {}) => request<T>("GET", path, undefined, { signal: withTimeout(opts.signal, GET_TIMEOUT_MS) }),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => request<T>("POST", path, body, opts),
  put: <T>(path: string, body: unknown, opts?: RequestOptions) => request<T>("PUT", path, body, opts),
  patch: <T>(path: string, body: unknown, opts?: RequestOptions) => request<T>("PATCH", path, body, opts),
  delete: <T>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, undefined, opts),
};
