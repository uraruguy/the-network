import { describe, expect, it } from "vitest";
import { isJournalFolder, isPersonFolder, listedJournalFolders, listedPersonFolders, personFolderOf } from "./folders";

describe("listedPersonFolders", () => {
  it("splits IMPORT_PERSON_FOLDERS on commas", () => {
    expect(listedPersonFolders(" Ana, Matevž ,,Luka ")).toEqual(["Ana", "Matevž", "Luka"]);
    expect(listedPersonFolders(undefined)).toEqual([]);
  });
});

describe("isPersonFolder", () => {
  const counts = new Map([["matevz", 3], ["ana", 1]]);
  it("trusts listed folders, diacritic-insensitively", () => {
    expect(isPersonFolder("Matevz", undefined, ["Matevž"])).toBe(true);
    expect(isPersonFolder("Ana", undefined, [])).toBe(false);
  });
  it("needs ≥2 candidates with that first name otherwise", () => {
    expect(isPersonFolder("Matevž", counts, [])).toBe(true);
    expect(isPersonFolder("Ana", counts, [])).toBe(false);
  });
  it("never treats context or multi-word folders as people", () => {
    expect(isPersonFolder("Work", new Map([["work", 5]]), [])).toBe(false);
    expect(isPersonFolder("Meeting Notes", counts, [])).toBe(false);
    expect(personFolderOf(["Work", "Matevž"], counts, [])).toBe("Matevž");
  });
});

describe("isJournalFolder", () => {
  it("knows common diary folders and yours from IMPORT_JOURNAL_FOLDERS", () => {
    expect(isJournalFolder(["Work", "journal"], listedJournalFolders(""))).toBe(true);
    expect(isJournalFolder(["Work"], listedJournalFolders(""))).toBe(false);
    expect(isJournalFolder(["Day log"], listedJournalFolders("Day log, Weekly"))).toBe(true);
  });
});
