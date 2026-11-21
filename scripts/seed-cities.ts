/**
 * Loads GeoNames places into the `cities` table: every city of ≥ 15 000 people worldwide, plus, for
 * the countries in DETAIL_COUNTRIES, every municipality seat and every town of ≥ 1 000 people.
 * Data: https://download.geonames.org/export/dump/ (CC BY 4.0)
 * Run: pnpm db:seed-cities (idempotent; re-run after changing DETAIL_COUNTRIES)
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import postgres from "postgres";

const CACHE = join(process.cwd(), ".cache", "geonames");
const CITIES = "cities15000";
/** Where the owner's network lives: places are picked town by town here, not just big cities. */
export const DETAIL_COUNTRIES = ["SI"];
const DETAIL_MIN_POPULATION = 1000;
/** Historical, abandoned, destroyed and city-section features: not places people live in. */
const NOT_A_TOWN = new Set(["PPLCH", "PPLH", "PPLQ", "PPLW", "PPLX"]);

export type CityRow = {
  id: number;
  name: string;
  ascii_name: string;
  admin: string | null;
  country: string;
  country_code: string;
  lat: number;
  lng: number;
  population: number | null;
  timezone: string | null;
  /** GeoNames feature code (PPLC, PPLA, PPL, …); used for selection, not stored. */
  feature: string;
};

/** Parses one line of a GeoNames dump (`geoname` table format, shared by cities*.txt and XX.txt). */
export function parseGeonamesLine(line: string, admin1: Map<string, string>, countryName: (cc: string) => string): CityRow | null {
  const c = line.split("\t");
  if (c.length < 18) return null;
  const [id, name, ascii, , lat, lng, featureClass, feature, cc, , a1, , , , pop, , , tz] = c;
  if (featureClass !== "P" || !cc) return null;
  return {
    id: Number(id),
    name: name!,
    ascii_name: ascii!,
    admin: admin1.get(`${cc}.${a1}`)?.replace(/^Municipality of /, "") ?? null,
    country: countryName(cc),
    country_code: cc,
    lat: Number(lat),
    lng: Number(lng),
    population: Number(pop) || null,
    timezone: tz || null,
    feature: feature!,
  };
}

/** A capital or municipality seat of any size, or a town of ≥ DETAIL_MIN_POPULATION. */
export function isDetailPlace(row: Pick<CityRow, "feature" | "population">) {
  if (/^PPL(C|A\d?)$/.test(row.feature)) return true;
  return !NOT_A_TOWN.has(row.feature) && (row.population ?? 0) >= DETAIL_MIN_POPULATION;
}

function fetchFile(name: string) {
  mkdirSync(CACHE, { recursive: true });
  const target = join(CACHE, name);
  if (!existsSync(target)) {
    console.log(`Downloading ${name}…`);
    execSync(`curl -fsSL -o "${target}" https://download.geonames.org/export/dump/${name}`, { stdio: "inherit" });
  }
  return target;
}

function readDump(base: string) {
  const txt = join(CACHE, `${base}.txt`);
  if (!existsSync(txt)) execSync(`unzip -o -q "${fetchFile(`${base}.zip`)}" "${base}.txt" -d "${CACHE}"`);
  return readFileSync(txt, "utf8").split("\n");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const sql = postgres(url, { prepare: false });

  const admin1 = new Map<string, string>();
  for (const line of readFileSync(fetchFile("admin1CodesASCII.txt"), "utf8").split("\n")) {
    const [code, name] = line.split("\t");
    if (code && name) admin1.set(code, name);
  }
  const names = new Intl.DisplayNames(["en"], { type: "region" });
  const countryName = (cc: string) => {
    try {
      return names.of(cc) ?? cc;
    } catch {
      return cc;
    }
  };

  const byId = new Map<number, CityRow>();
  for (const line of readDump(CITIES)) {
    const row = parseGeonamesLine(line, admin1, countryName);
    if (row) byId.set(row.id, row);
  }
  for (const cc of DETAIL_COUNTRIES) {
    let added = 0;
    for (const line of readDump(cc)) {
      const row = parseGeonamesLine(line, admin1, countryName);
      if (row && isDetailPlace(row) && !byId.has(row.id)) {
        byId.set(row.id, row);
        added++;
      }
    }
    console.log(`${cc}: +${added} towns and municipality seats.`);
  }
  const rows = [...byId.values()];
  console.log(`Parsed ${rows.length} places. Upserting…`);

  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await sql`
      insert into cities ${sql(chunk, "id", "name", "ascii_name", "admin", "country", "country_code", "lat", "lng", "population", "timezone")}
      on conflict (id) do update set
        name = excluded.name, ascii_name = excluded.ascii_name, admin = excluded.admin, country = excluded.country,
        country_code = excluded.country_code, lat = excluded.lat, lng = excluded.lng, population = excluded.population, timezone = excluded.timezone
    `;
    process.stdout.write(`\r${Math.min(i + BATCH, rows.length)}/${rows.length}`);
  }
  console.log("\nDone.");
  await sql.end();
}

if (process.argv[1]?.endsWith("seed-cities.ts")) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
