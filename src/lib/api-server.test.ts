import { describe, expect, it, vi } from "vitest";
import type { Owner } from "@/lib/auth/server";
import { serverTiming, sessionVerdict, withOwner } from "./api-server";

const OWNER = "114287d9-de5c-4ff5-a9b5-25d0785552e7";

const auth = vi.hoisted(() => ({ owner: null as Owner | null }));
vi.mock("@/lib/auth/server", () => ({ getOwner: async () => auth.owner }));

describe("sessionVerdict (withOwner fresh check)", () => {
  it("is alive when Auth returns the same user", () => {
    expect(sessionVerdict(OWNER, OWNER, null)).toBe("alive");
  });

  it("ended: revoked session, signed out elsewhere, no session, another user", () => {
    expect(sessionVerdict(OWNER, null, { name: "AuthApiError", status: 403 })).toBe("ended"); // session_not_found
    expect(sessionVerdict(OWNER, null, { name: "AuthApiError", status: 400 })).toBe("ended"); // refresh_token_not_found
    expect(sessionVerdict(OWNER, null, { name: "AuthSessionMissingError", status: 400 })).toBe("ended");
    expect(sessionVerdict(OWNER, "someone-else", null)).toBe("ended");
    expect(sessionVerdict(OWNER, null, null)).toBe("ended");
  });

  it("unavailable: network failures, rate limits and Auth outages (retry, don't sign out)", () => {
    expect(sessionVerdict(OWNER, null, { name: "AuthRetryableFetchError", status: 0 })).toBe("unavailable");
    expect(sessionVerdict(OWNER, null, { name: "AuthApiError", status: 429 })).toBe("unavailable");
    expect(sessionVerdict(OWNER, null, { name: "AuthApiError", status: 502 })).toBe("unavailable");
    expect(sessionVerdict(OWNER, null, { name: "AuthUnknownError" })).toBe("unavailable");
  });
});

describe("Server-Timing", () => {
  it("formats phases in order, in ms", () => {
    expect(serverTiming({ auth: 3.14159, handler: 120, total: 123.2 })).toBe("auth;dur=3.1, handler;dur=120.0, total;dur=123.2");
  });

  it("is added by withOwner without touching the body or Cache-Control", async () => {
    auth.owner = { id: OWNER, claims: {} as Owner["claims"], mfaSatisfied: true, mfaVerified: true };
    const ok = await withOwner(async ({ ownerId }) => ({ ownerId }))(new Request("http://localhost:3100/api/x"), { params: Promise.resolve({}) });
    expect(await ok.json()).toEqual({ ownerId: OWNER });
    expect(ok.headers.get("cache-control")).toBe("private, no-store");
    expect(ok.headers.get("server-timing")).toMatch(/^auth;dur=\d+\.\d, handler;dur=\d+\.\d, total;dur=\d+\.\d$/);

    auth.owner = null;
    const denied = await withOwner(async () => ({}))(new Request("http://localhost:3100/api/x"), { params: Promise.resolve({}) });
    expect(denied.status).toBe(401);
    expect(await denied.json()).toEqual({ error: "unauthenticated", message: "Not signed in" });
    expect(denied.headers.get("server-timing")).toMatch(/^total;dur=\d+\.\d$/);
  });
});
