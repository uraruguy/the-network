import { describe, expect, it } from "vitest";
import { transitionKey } from "./nav";

describe("transitionKey", () => {
  it("keeps every settings section on one key", () => {
    expect(transitionKey("/settings")).toBe("/settings");
    expect(transitionKey("/settings/profile")).toBe("/settings");
    expect(transitionKey("/settings/ai")).toBe("/settings");
  });

  it("gives every other route its own key", () => {
    expect(transitionKey("/people/1")).toBe("/people/1");
    expect(transitionKey("/settingsx")).toBe("/settingsx");
  });
});
