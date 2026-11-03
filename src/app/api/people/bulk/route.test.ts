import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Owner } from "@/lib/auth/server";

/** POST /api/people/bulk with the data layer mocked: auth, validation, dedupe, which action runs. */

const OWNER = "114287d9-de5c-4ff5-a9b5-25d0785552e7";
const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";

let owner: Owner | null = null;
vi.mock("@/lib/auth/server", () => ({ getOwner: async () => owner }));
const people = vi.hoisted(() => ({ deletePeople: vi.fn(), restorePeople: vi.fn() }));
vi.mock("@/lib/data/people", () => people);

const { POST } = await import("./route");

const post = (body: unknown) =>
  POST(new Request("http://localhost:3100/api/people/bulk", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }), {
    params: Promise.resolve({}),
  });

beforeEach(() => {
  vi.clearAllMocks();
  owner = { id: OWNER, claims: {} as Owner["claims"], mfaSatisfied: true, mfaVerified: true };
  people.deletePeople.mockImplementation(async (_o: string, ids: string[]) => ids);
  people.restorePeople.mockImplementation(async (_o: string, ids: string[]) => ids.slice(0, 1));
});

describe("POST /api/people/bulk", () => {
  it("soft-deletes the given people for the signed-in owner (duplicates once)", async () => {
    const res = await post({ action: "delete", ids: [A, B, A] });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ action: "delete", ids: [A, B] });
    expect(people.deletePeople).toHaveBeenCalledWith(OWNER, [A, B]);
    expect(people.restorePeople).not.toHaveBeenCalled();
  });

  it("restores and reports only the ids that came back", async () => {
    const res = await post({ action: "restore", ids: [A, B] });
    expect(await res.json()).toEqual({ action: "restore", ids: [A] });
    expect(people.restorePeople).toHaveBeenCalledWith(OWNER, [A, B]);
  });

  it.each([
    [{ action: "purge", ids: [A] }],
    [{ action: "delete", ids: [] }],
    [{ action: "delete", ids: ["not-a-uuid"] }],
    [{ action: "delete", ids: Array.from({ length: 501 }, () => A) }],
  ])("rejects %j", async (body) => {
    const res = await post(body);
    expect(res.status).toBe(422);
    expect(people.deletePeople).not.toHaveBeenCalled();
  });

  it("refuses without a signed-in owner", async () => {
    owner = null;
    expect((await post({ action: "delete", ids: [A] })).status).toBe(401);
  });
});
