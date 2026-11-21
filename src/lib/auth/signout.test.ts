// @vitest-environment happy-dom
import { expect, it } from "vitest";
import { clearSupabaseCookies } from "./signout";

it("deletes every Supabase auth cookie and keeps the others", () => {
  for (const c of ["sb-abc-auth-token.0=x", "sb-abc-auth-token.1=y", "sb-abc-auth-token-code-verifier=z", "theme=dark"]) document.cookie = `${c}; Path=/`;
  clearSupabaseCookies();
  expect(document.cookie).toBe("theme=dark");
});
