import { describe, expect, it } from "vitest";
import { extractPrompt } from "./extract";
import { buildResolveBrief, resolveRules } from "./resolve";
import { screenPrompt } from "./screen";
import { importOwner, importSystem, ownerFirstName, ownerSelfForms } from "./system";

/** The import prompts are written for whoever owns the instance, not for the author. */

const ana = importOwner(" Ana Nartnik ", "Designer in Lisbon; notes in Portuguese and English");
const nobody = importOwner(null);
const note = { title: "Coffee", text: "Coffee with Marko.", created: null, folders: [], existingNames: [], mode: "full" as const };
const brief = (owner = ana) =>
  buildResolveBrief({ runId: "r1", runDir: "/tmp/r1", packets: [{ packetId: "p1", kind: "unique", mentions: 2, clusters: ["Marko"] }], validateCmd: "validate", owner });

describe("import prompts", () => {
  it("name the owner from their profile and add IMPORT_CONTEXT", () => {
    expect(ana).toEqual({ name: "Ana Nartnik", context: "Designer in Lisbon; notes in Portuguese and English" });
    expect(importSystem(ana)).toMatch(/^You help Ana Nartnik organise their personal network/);
    expect(importSystem(ana)).toContain("About them: Designer in Lisbon");
    expect(extractPrompt({ ...note, owner: ana })).toContain("Skip Ana themself");
    expect(screenPrompt([], ana)).toContain("named people Ana knows or met");
    expect(resolveRules(ana)).toContain('`self` — Ana themself ("Ana", "Ana Nartnik", "I", "me", "jaz")');
    expect(brief()).toContain("who is who in Ana Nartnik's Apple Notes import");
  });

  it("fall back to “the owner” without a profile name", () => {
    expect(ownerFirstName(nobody)).toBe("the owner");
    expect(ownerSelfForms(nobody)).toEqual(["I", "me", "jaz"]);
    expect(importSystem(nobody)).toMatch(/^You help the owner organise/);
    expect(importSystem(nobody)).not.toContain("About them");
    expect(brief(nobody)).toContain("the owner's Apple Notes import");
  });

  it("stay neutral about the owner", () => {
    const all = [importSystem(ana), extractPrompt({ ...note, owner: ana }), screenPrompt([], ana), brief()].join("\n");
    expect(all).not.toMatch(/\bhe\b|\bhis\b/);
  });
});
