import "server-only";
import { sql } from "drizzle-orm";
import { db, schema, type Tx } from "@/lib/db";
import type { LocationData } from "@/lib/schemas";

/**
 * Find-or-create an owner-scoped location in one statement. Places from the cities dataset dedupe
 * on (owner, cityId); manual places (no cityId) are always inserted.
 */
export async function upsertLocation(ownerId: string, input: LocationData, tx: Tx | typeof db = db) {
  const [row] = await tx
    .insert(schema.locations)
    .values({
      ownerId,
      name: input.name,
      admin: input.admin ?? null,
      country: input.country,
      countryCode: input.countryCode ?? null,
      lat: input.lat,
      lng: input.lng,
      timezone: input.timezone ?? null,
      cityId: input.cityId ?? null,
      source: input.cityId ? "cities" : "manual",
    })
    .onConflictDoUpdate({
      target: [schema.locations.ownerId, schema.locations.cityId],
      // Keep the stored row; touching updated_at makes RETURNING yield the existing id.
      set: { updatedAt: sql`now()` },
    })
    .returning();
  return row!;
}

/**
 * The country an owner's towns should rank first in: their home's, else the one most of their
 * people live in. Lazily evaluated by `coalesce`, so the fallback only runs without a home.
 */
const preferredCountry = (ownerId: string) => sql`coalesce(
  (select l.country_code from profiles p join locations l on l.id = p.home_location_id where p.id = ${ownerId}),
  (select l.country_code from people pe join locations l on l.id = pe.home_location_id
    where pe.owner_id = ${ownerId} and pe.deleted_at is null and l.country_code is not null group by 1 order by count(*) desc limit 1))`;

/** Prefix search over the cities dataset (search_cities: exact names first, then population; `ownerId` boosts their country). */
export async function searchCities(q: string, limit = 8, ownerId?: string) {
  if (!q.trim()) return [];
  // The country goes in through a lateral column: a subquery argument would stop Postgres from
  // inlining search_cities (and planning its trigram index scan with the actual prefix).
  const prefer = ownerId ? preferredCountry(ownerId) : sql`null::text`;
  const rows = await db.execute(sql`select c.* from (select ${prefer} as code) p, search_cities(${q.trim()}, ${limit}, p.code) c`);
  return rows.map((r) => ({
    id: Number(r.id),
    name: String(r.name),
    asciiName: String(r.ascii_name),
    admin: (r.admin as string | null) ?? null,
    country: String(r.country),
    countryCode: String(r.country_code),
    lat: Number(r.lat),
    lng: Number(r.lng),
    population: r.population == null ? null : Number(r.population),
    timezone: (r.timezone as string | null) ?? null,
  })) satisfies schema.City[];
}
