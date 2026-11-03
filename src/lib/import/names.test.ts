import { describe, expect, it } from "vitest";
import { deaccent, genderHint, isFullName, lemmaCandidates, nameVariants, nicknameCanon, normName, personKey } from "./names";

describe("deaccent", () => {
  it("folds Slovenian and other diacritics", () => {
    expect(deaccent("Matevž Čuk Šuštar")).toBe("Matevz Cuk Sustar");
    expect(deaccent("Đurđa")).toBe("Djurdja");
    expect(deaccent("Jürgen Tromsø")).toBe("Jurgen Tromso");
    expect(deaccent("Ćiro")).toBe("Ciro");
  });
});

describe("lemmaCandidates", () => {
  const has = (s: string, base: string) => expect(lemmaCandidates(s)).toContain(base);
  it("keeps the surface first", () => expect(lemmaCandidates("Matevžem")[0]).toBe("Matevžem"));
  it("masculine consonant stems", () => {
    has("Matevžem", "Matevž");
    has("Matevža", "Matevž");
    has("Matevžu", "Matevž");
    has("Petrom", "Petr");
  });
  it("i/j stems", () => {
    has("Janija", "Jani");
    has("Janiju", "Jani");
    has("Janijem", "Jani");
  });
  it("a-stems (feminine and masculine -a)", () => {
    has("Nežo", "Neža");
    has("Neže", "Neža");
    has("Miho", "Miha");
    has("Mihi", "Miha");
  });
  it("Jani is ambiguous between Jani and Jana", () => {
    const l = lemmaCandidates("Jani");
    expect(l).toContain("Jani");
    expect(l).toContain("Jana");
  });
  it("o-names and -e names with -t-", () => {
    has("Marka", "Marko");
    has("Markom", "Marko");
    has("Toneta", "Tone");
  });
  it("possessives", () => {
    has("Matevževa", "Matevž");
    has("Nežina", "Neža");
  });
  it("multi-word surfaces", () => expect(lemmaCandidates("Matevžem Nartnikom")).toContain("Matevž Nartnik"));
});

describe("names helpers", () => {
  it("normName / personKey", () => {
    expect(normName("  Matevž   Nartník ")).toBe("matevz nartnik");
    expect(personKey("Matevž Nartnik")).toBe("matevz-nartnik");
    expect(personKey("Matevž", "Acme")).toBe("matevz-acme");
    expect(personKey("Dr. Ana-Marija Kos")).toBe("ana-marija-kos");
  });
  it("isFullName", () => {
    expect(isFullName("Matevž Nartnik")).toBe(true);
    expect(isFullName("Matevž")).toBe(false);
    expect(isFullName("Mira A.")).toBe(false);
    expect(isFullName("Mira A. Lindgren")).toBe(true);
  });
  it("nickname groups", () => {
    expect(nicknameCanon("Aleks")).toBe("alex");
    expect(nicknameCanon("Aleksander")).toBe("alex");
    expect(nicknameCanon("Janez")).toBe("jani");
    expect(nicknameCanon("Matjazek")).toBe("matjaz");
    expect(nicknameCanon("Zoran")).toBe("zoran");
    expect(nameVariants("Matjaž")).toContain("matjazek");
  });
});

describe("genderHint", () => {
  const at = (text: string, name: string) => genderHint(text, text.indexOf(name));
  it("reads participles", () => {
    expect(at("Neža je rekla, da pride.", "Neža")).toBe("f");
    expect(at("Matevž je rekou da bo šou.", "Matevž")).toBe("m");
    expect(at("Jani je bil tam.", "Jani")).toBe("m");
    expect(at("Jani je bila tam.", "Jani")).toBe("f");
  });
  it("ignores nouns after the auxiliary", () => {
    expect(at("Jana Sever je učiteljica na srednji šoli.", "Jana")).toBeNull();
  });
  it("returns null without a signal", () => {
    expect(at("Srečal Petra na kavi.", "Petra")).toBeNull();
  });
  it("stops at the sentence end", () => {
    expect(at("Videl sem Miho. Ana je rekla nekaj.", "Miho")).toBeNull();
  });
});
