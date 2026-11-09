import { describe, expect, it } from "vitest";
import { extractPrompt } from "./extract";
import { buildResolveBrief, resolveRules } from "./resolve";
import { screenPrompt } from "./screen";
import { importOwner, importSystem, ownerFirstName, ownerSelfForms } from "./system";

/** The import prompts are written for whoever owns the instance, not for the author. */

const marija = importOwner(" Marija Novak ", "Designer in Lisbon; notes in Portuguese and English");
const nobody = importOwner(null);
const note = { title: "Coffee", text: "Coffee with Marko.", created: null, folders: [], existingNames: [], mode: "full" as const };
const brief = (owner = marija) =>
  buildResolveBrief({ runId: "r1", runDir: "/tmp/r1", packets: [{ packetId: "p1", kind: "unique", mentions: 2, clusters: ["Marko"] }], validateCmd: "validate", owner });

describe("import prompts", () => {
  it("name the owner from their profile and add IMPORT_CONTEXT", () => {
    expect(marija).toEqual({ name: "Marija Novak", context: "Designer in Lisbon; notes in Portuguese and English" });
    expect(importSystem(marija)).toMatch(/^You help Marija Novak organise their personal network/);
    expect(importSystem(marija)).toContain("About them: Designer in Lisbon");
    expect(extractPrompt({ ...note, owner: marija })).toContain("Skip Marija themself");
    expect(screenPrompt([], marija)).toContain("named people Marija knows or met");
    expect(resolveRules(marija)).toContain('`self` — Marija themself ("Marija", "Marija Novak", "I", "me", "jaz")');
    expect(brief()).toContain("who is who in Marija Novak's Apple Notes import");
  });

  it("fall back to “the owner” without a profile name", () => {
    expect(ownerFirstName(nobody)).toBe("the owner");
    expect(ownerSelfForms(nobody)).toEqual(["I", "me", "jaz"]);
    expect(importSystem(nobody)).toMatch(/^You help the owner organise/);
    expect(importSystem(nobody)).not.toContain("About them");
    expect(brief(nobody)).toContain("the owner's Apple Notes import");
  });

  it("stay neutral about the owner", () => {
    const all = [importSystem(marija), extractPrompt({ ...note, owner: marija }), screenPrompt([], marija), brief()].join("\n");
    expect(all).not.toMatch(/\bhe\b|\bhis\b/);
  });
});
