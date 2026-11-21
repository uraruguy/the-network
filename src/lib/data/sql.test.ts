import { describe, expect, it } from "vitest";
import { pgError } from "./sql";

describe("pgError", () => {
  it("finds the SQLSTATE on the error or inside drizzle's wrapper", () => {
    const pg = { code: "42883", message: "function search_cities(text, integer, text) does not exist" };
    expect(pgError(pg, "42883")).toBe(pg);
    expect(pgError({ message: "Failed query", cause: pg }, "42883")).toBe(pg);
    expect(pgError({ cause: pg }, "23505")).toBeNull();
    expect(pgError(new Error("network"), "42883")).toBeNull();
    expect(pgError(undefined, "42883")).toBeNull();
  });
});
