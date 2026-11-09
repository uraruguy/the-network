import { describe, expect, it } from "vitest";
import { flagSentences, focusSnippet, highlightSegments, placeLabel, possibleSameAs, type FlagInput } from "./text";

const hits = (text: string, terms: string[]) => highlightSegments(text, terms).filter((s) => s.hit).map((s) => s.text);

describe("highlightSegments", () => {
  it("highlights names diacritic- and case-insensitively", () => {
    expect(hits("Kava z matevzem in Matevžem v Ljubljani", ["Matevž"])).toEqual(["matevzem", "Matevžem"]);
  });
  it("covers short inflected endings and vowel-final stems", () => {
    expect(hits("Srečala sem Nežo in Miho", ["Neža", "Miha"])).toEqual(["Nežo", "Miho"]);
  });
  it("matches the full name or its tokens (with endings), never inside other words", () => {
    expect(hits("Peter Novak (Petra ne) — Novakovi", ["Peter Novak"])).toEqual(["Peter Novak", "Novakovi"]);
    expect(hits("Pri Novaku je bil tudi Peter", ["Peter Novak"])).toEqual(["Novaku", "Peter"]);
    expect(hits("Ana in Banana", ["Ana"])).toEqual(["Ana"]);
  });
  it("keeps the full text when nothing matches", () => {
    expect(highlightSegments("nič", ["Matevž"])).toEqual([{ text: "nič", hit: false }]);
    expect(highlightSegments("", ["Matevž"])).toEqual([]);
  });
  it("joins back to the original text", () => {
    const t = "Đurđa in Søren sta prišla z Đurđo.";
    expect(highlightSegments(t, ["Đurđa", "Søren"]).map((s) => s.text).join("")).toBe(t);
    expect(hits(t, ["Đurđa", "Søren"])).toEqual(["Đurđa", "Søren", "Đurđo"]);
  });
});

describe("focusSnippet", () => {
  it("centres a long snippet on the first hit", () => {
    const long = `${"x ".repeat(200)}Matevž je rekel nekaj pomembnega ${"y ".repeat(200)}`;
    const s = focusSnippet(long, ["Matevž"], 80);
    expect(s.startsWith("…")).toBe(true);
    expect(s).toContain("Matevž");
    expect(s.length).toBeLessThanOrEqual(84);
  });
});

describe("flagSentences", () => {
  const base: FlagInput = { reviewFlags: [], reasons: null, matchPerson: null, similar: [], disposition: "person", confidence: 0.9, mentionCount: 3 };
  it("turns flags into plain sentences", () => {
    const s = flagSentences({ ...base, reviewFlags: ["first_name_only", "possible_duplicate"], reasons: "Matevž from Lisbon [possible same as: Ivan Horvat]" });
    expect(s.map((x) => x.text)).toEqual(["Maybe the same as Ivan Horvat", "First name only"]);
  });
  it("falls back to similar people and the matched person", () => {
    const s = flagSentences({ ...base, reviewFlags: ["possible_duplicate", "existing_match_uncertain"], similar: [{ kind: "proposal", displayName: "Jana Kovač" }], matchPerson: { displayName: "Jana K." } });
    expect(s.map((x) => x.text)).toEqual(["Maybe the same as Jana Kovač", "Might already be in The Network as Jana K."]);
  });
  it("mentions dispositions and thin evidence", () => {
    expect(flagSentences({ ...base, disposition: "passerby", reviewFlags: ["user_attention"] }).map((x) => x.text)).toEqual(["Looks like a passer-by"]);
    expect(flagSentences({ ...base, mentionCount: 1, confidence: 0.6 }).map((x) => x.text)).toEqual(["Mentioned only once, briefly"]);
    expect(flagSentences(base)).toEqual([]);
  });
  it("parses possible-same-as lists", () => {
    expect(possibleSameAs("x [possible same as: A B, C] y [possible same as: C]")).toEqual(["A B", "C"]);
    expect(possibleSameAs(null)).toEqual([]);
  });
});

describe("placeLabel", () => {
  it("prefers the geocoded place", () => {
    expect(placeLabel({ name: "Ljubljana", countryCode: "SI" }, "Ljubljani")).toBe("Ljubljana, SI");
    expect(placeLabel(null, " Berlin ")).toBe("Berlin");
    expect(placeLabel(null, null)).toBeNull();
  });
});
