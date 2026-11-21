import { describe, expect, it } from "vitest";
import { isDetailPlace, parseGeonamesLine } from "./seed-cities";

const line = (over: Partial<Record<number, string>> = {}) => {
  const c = ["3196683", "Bled", "Bled", "Bled,Veldes", "46.36917", "14.11361", "P", "PPLA", "SI", "", "03", "", "", "", "5181", "", "504", "Europe/Ljubljana", "2023-01-01"];
  for (const [i, v] of Object.entries(over)) c[Number(i)] = v!;
  return c.join("\t");
};
const admin1 = new Map([["SI.03", "Municipality of Bled"], ["SI.C2", "Urban Municipality of Maribor"]]);
const countryName = (cc: string) => (cc === "SI" ? "Slovenia" : cc);

describe("parseGeonamesLine", () => {
  it("maps a dump line to a cities row, without the 'Municipality of' prefix", () => {
    expect(parseGeonamesLine(line(), admin1, countryName)).toEqual({
      id: 3196683,
      name: "Bled",
      ascii_name: "Bled",
      admin: "Bled",
      country: "Slovenia",
      country_code: "SI",
      lat: 46.36917,
      lng: 14.11361,
      population: 5181,
      timezone: "Europe/Ljubljana",
      feature: "PPLA",
    });
  });

  it("also drops the 'Urban Municipality of' prefix of city municipalities", () => {
    expect(parseGeonamesLine(line({ 10: "C2" }), admin1, countryName)?.admin).toBe("Maribor");
  });

  it("skips non-places and short lines; unknown population and admin become null", () => {
    expect(parseGeonamesLine(line({ 6: "H", 7: "LK" }), admin1, countryName)).toBeNull();
    expect(parseGeonamesLine("", admin1, countryName)).toBeNull();
    expect(parseGeonamesLine(line({ 10: "99", 14: "0" }), admin1, countryName)).toMatchObject({ admin: null, population: null });
  });
});

describe("isDetailPlace", () => {
  it("keeps capitals and municipality seats of any size", () => {
    expect(isDetailPlace({ feature: "PPLC", population: null })).toBe(true);
    expect(isDetailPlace({ feature: "PPLA", population: 300 })).toBe(true);
    expect(isDetailPlace({ feature: "PPLA2", population: null })).toBe(true);
  });

  it("keeps towns from 1 000 people, never city sections or historical places", () => {
    expect(isDetailPlace({ feature: "PPL", population: 1000 })).toBe(true);
    expect(isDetailPlace({ feature: "PPL", population: 999 })).toBe(false);
    expect(isDetailPlace({ feature: "PPL", population: null })).toBe(false);
    expect(isDetailPlace({ feature: "PPLX", population: 20000 })).toBe(false);
    expect(isDetailPlace({ feature: "PPLH", population: 5000 })).toBe(false);
  });
});
