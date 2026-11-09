/**
 * LOCAL-ONLY demo cast for the README and landing-page screenshots (docs/screenshots, site/assets).
 *
 *   pnpm exec tsx scripts/dev/seed-demo.ts seed    # owner "Alex" + the featured people (replaces an earlier demo cast)
 *   pnpm exec tsx scripts/dev/seed-demo.ts clean   # removes the demo people, their notes and follow-ups again
 *
 * Then `scripts/dev/seed-people.ts seed 280` adds the crowd. Every name is a well-known placeholder
 * ("John Doe" and its counterparts elsewhere). Dates are relative to today in the owner's time zone,
 * so the screens look the same whenever this runs: three follow-ups due today, two later this week,
 * two notes on Hanako from today, and four inner-circle people last seen 2–3 months ago (Today →
 * Reconnect). Rows carry `source_kind` / `source` = 'dev-demo'; `seed` also sets the owner's name,
 * home city and time zone, which `clean` leaves alone. Refuses to run against anything but localhost.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import postgres from "postgres";

const SOURCE = "dev-demo";
const url = process.env.DATABASE_URL ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = (u: string) => /^(postgres(ql)?|https?):\/\/([^@/]*@)?(127\.0\.0\.1|localhost)[:/]/.test(u);
if (!isLocal(url) || !isLocal(supabaseUrl)) throw new Error("Refusing to seed: DATABASE_URL / NEXT_PUBLIC_SUPABASE_URL must point at localhost");

const sql = postgres(url, { prepare: false, max: 1 });
const email = process.env.DEV_EMAIL;

const OWNER = { name: "Alex", city: ["Ljubljana", "SI"], timezone: "Europe/Ljubljana" } as const;

/** A follow-up `days` after today, at a local `time`. */
type Followup = { message: string; days: number; time: string };
type Note = { title: string; kind: "call" | "meeting"; time: string };
type Member = {
  first: string;
  last: string;
  /** Display order differs from first/last for family-name-first names. */
  display?: string;
  headline: string;
  company?: string;
  city: readonly [name: string, countryCode: string];
  warmth: "inner" | "active";
  /** Days since the last interaction (none: only today's notes, if any). */
  lastSeen?: number;
  categories?: string[];
  activities?: string[];
  followup?: Followup;
  notes?: Note[];
};

/** Today's due items sort by time (Hanako, Max, Marie); the Reconnect row by longest silence. */
const CAST: Member[] = [
  {
    first: "Hanako",
    last: "Yamada",
    headline: "Designer",
    company: "Studio Mono",
    city: ["Tokyo", "JP"],
    warmth: "active",
    activities: ["coffee", "dinners"],
    followup: { message: "Send her the deck from Tuesday", days: 0, time: "09:00" },
    notes: [
      { title: "Call: she's in Berlin 12–15 May for a client workshop", kind: "call", time: "13:15" },
      { title: "Coffee at Fuglen after the design conference", kind: "meeting", time: "10:40" },
    ],
  },
  {
    first: "Max",
    last: "Mustermann",
    headline: "Engineering manager",
    company: "Northwind",
    city: ["Copenhagen", "DK"],
    warmth: "active",
    lastSeen: 26,
    categories: ["friend"],
    activities: ["running"],
    followup: { message: "Ask how the Copenhagen move went", days: 0, time: "09:30" },
  },
  {
    first: "Marie",
    last: "Dupont",
    headline: "Founder",
    city: ["Paris", "FR"],
    warmth: "active",
    lastSeen: 12,
    categories: ["founder"],
    activities: ["lunch"],
    followup: { message: "Intro to the design studio in Lisbon", days: 0, time: "10:00" },
  },
  {
    first: "John",
    last: "Doe",
    headline: "Product manager",
    city: ["New York City", "US"],
    warmth: "inner",
    lastSeen: 9,
    categories: ["friend"],
    activities: ["padel", "drinks"],
    followup: { message: "Padel rematch", days: 1, time: "18:00" },
  },
  {
    first: "Ola",
    last: "Nordmann",
    headline: "Head of Growth",
    city: ["Oslo", "NO"],
    warmth: "active",
    lastSeen: 41,
    categories: ["acquaint"],
    activities: ["skiing"],
    followup: { message: "Congratulate on the new role", days: 2, time: "09:00" },
  },
  { first: "Anna", last: "Kowalska", headline: "Architect", city: ["Warsaw", "PL"], warmth: "inner", lastSeen: 96, categories: ["friend"], activities: ["hiking"] },
  { first: "Juan", last: "Pérez", headline: "Chef", city: ["Mexico City", "MX"], warmth: "inner", lastSeen: 83, categories: ["friend"], activities: ["dinners"] },
  {
    first: "Gil-dong",
    last: "Hong",
    display: "Hong Gil-dong",
    headline: "Researcher",
    city: ["Seoul", "KR"],
    warmth: "inner",
    lastSeen: 74,
    categories: ["mentor"],
    activities: ["climbing"],
  },
  { first: "Matti", last: "Meikäläinen", headline: "Photographer", city: ["Helsinki", "FI"], warmth: "inner", lastSeen: 66, categories: ["friend"], activities: ["cycling"] },
];

/** The owner: DEV_EMAIL when set, else the instance's single profile (whatever `pnpm bootstrap` created). */
async function ownerId(): Promise<string> {
  const rows = email ? await sql<{ id: string }[]>`select id from auth.users where email = ${email}` : await sql<{ id: string }[]>`select id from profiles`;
  if (rows.length !== 1) throw new Error(email ? `No auth user ${email}` : `Expected one profile, found ${rows.length}: run pnpm bootstrap (or set DEV_EMAIL)`);
  return rows[0]!.id;
}

/** The owner's location for a GeoNames city (biggest match), created on first use. */
async function locationFor(owner: string, [name, cc]: readonly [string, string]): Promise<string> {
  const [city] = await sql<{ id: number }[]>`
    select id from cities where (name = ${name} or ascii_name = ${name}) and country_code = ${cc} order by population desc nulls last limit 1`;
  if (!city) throw new Error(`City ${name} (${cc}) not found: run pnpm db:seed-cities`);
  await sql`
    insert into locations (owner_id, name, admin, country, country_code, lat, lng, timezone, city_id, source)
    select ${owner}, c.name, c.admin, c.country, c.country_code, c.lat, c.lng, c.timezone, c.id, ${SOURCE}
    from cities c where c.id = ${city.id}
    on conflict (owner_id, city_id) do nothing`;
  const [loc] = await sql<{ id: string }[]>`select id from locations where owner_id = ${owner} and city_id = ${city.id}`;
  return loc!.id;
}

async function seed() {
  const owner = await ownerId();
  await clean(owner, true);

  const home = await locationFor(owner, OWNER.city);
  await sql`update profiles set display_name = ${OWNER.name}, timezone = ${OWNER.timezone}, home_location_id = ${home} where id = ${owner}`;
  const tz = OWNER.timezone;
  // Local wall-clock time `days` from today in the owner's zone, as timestamptz.
  const at = (days: number, time: string) => sql`((date_trunc('day', now() at time zone ${tz}) + ${`${days} days ${time}`}::interval) at time zone ${tz})`;

  const cats = new Map((await sql<{ id: string; slug: string }[]>`select id, slug from categories where owner_id = ${owner}`).map((r) => [r.slug, r.id]));
  const acts = new Map((await sql<{ id: string; slug: string }[]>`select id, slug from activities where owner_id = ${owner}`).map((r) => [r.slug, r.id]));

  for (const m of CAST) {
    const loc = await locationFor(owner, m.city);
    const [person] = await sql<{ id: string }[]>`
      insert into people (owner_id, display_name, first_name, last_name, headline, company, home_location_id, warmth, last_interaction_at, source_kind, created_at)
      values (${owner}, ${m.display ?? `${m.first} ${m.last}`}, ${m.first}, ${m.last}, ${m.headline}, ${m.company ?? null}, ${loc}, ${m.warmth},
              ${m.lastSeen === undefined ? null : sql`now() - ${`${m.lastSeen} days`}::interval`}, ${SOURCE}, now() - interval '400 days')
      returning id`;
    const id = person!.id;
    for (const slug of m.categories ?? []) if (cats.has(slug)) await sql`insert into person_categories (person_id, category_id, owner_id) values (${id}, ${cats.get(slug)!}, ${owner}) on conflict do nothing`;
    for (const slug of m.activities ?? []) if (acts.has(slug)) await sql`insert into person_activities (person_id, activity_id, owner_id) values (${id}, ${acts.get(slug)!}, ${owner}) on conflict do nothing`;
    // Notes from today, never in the future: clamp to the past when seeding early in the day.
    for (const [i, n] of (m.notes ?? []).entries()) {
      await sql`
        insert into notes (owner_id, person_id, title, kind, occurred_at, source_kind)
        values (${owner}, ${id}, ${n.title}, ${n.kind},
                greatest(${at(0, "00:01")} + ${`${m.notes!.length - i} minutes`}::interval, least(${at(0, n.time)}, now() - ${`${20 + i * 60} minutes`}::interval)),
                ${SOURCE})`;
    }
    if (m.followup) {
      await sql`
        insert into reminders (owner_id, person_id, due_at, message, source_kind)
        values (${owner}, ${id}, ${at(m.followup.days, m.followup.time)}, ${m.followup.message}, ${SOURCE})`;
    }
  }
  console.log(`Seeded the demo cast: ${CAST.length} people; owner "${OWNER.name}" (${OWNER.city[0]}, ${OWNER.timezone}).`);
}

/** Demo people (notes and follow-ups cascade) and the demo's locations nothing else uses. */
async function clean(owner?: string, quiet = false) {
  owner ??= await ownerId();
  const del = await sql`delete from people where owner_id = ${owner} and source_kind = ${SOURCE}`;
  const locs = await sql`
    delete from locations l where l.owner_id = ${owner} and l.source = ${SOURCE}
      and not exists (select 1 from people p where p.home_location_id = l.id or p.met_location_id = l.id)
      and not exists (select 1 from profiles pr where pr.home_location_id = l.id)`;
  if (!quiet || del.count) console.log(`Removed ${del.count} demo people, ${locs.count} locations.`);
}

const [cmd = "seed"] = process.argv.slice(2);
(cmd === "clean" ? clean() : seed())
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
