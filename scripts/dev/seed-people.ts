/**
 * LOCAL-ONLY bulk people seed for list / virtualization / filter testing.
 *
 *   pnpm exec tsx scripts/dev/seed-people.ts seed [count=600]   # adds fake people (source_kind = 'dev-seed')
 *   pnpm exec tsx scripts/dev/seed-people.ts clean               # removes every seeded row again
 *
 * Seeded people get home cities (from the GeoNames `cities` table), categories, activities, tags,
 * warmth, last-interaction and follow-up dates. Refuses to run against anything but localhost.
 */
import { config } from "dotenv";
config({ path: [".env.local", ".env"] });
import postgres from "postgres";

const SOURCE = "dev-seed";
const url = process.env.DATABASE_URL ?? "";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const isLocal = (u: string) => /^(postgres(ql)?|https?):\/\/([^@/]*@)?(127\.0\.0\.1|localhost)[:/]/.test(u);
if (!isLocal(url) || !isLocal(supabaseUrl)) throw new Error("Refusing to seed: DATABASE_URL / NEXT_PUBLIC_SUPABASE_URL must point at localhost");

const sql = postgres(url, { prepare: false, max: 1 });
const email = process.env.DEV_EMAIL;

/* Deterministic PRNG so repeated seeds look the same. */
let s = 0x9e3779b9;
const rand = () => {
  s |= 0;
  s = (s + 0x6d2b79f5) | 0;
  let t = Math.imul(s ^ (s >>> 15), 1 | s);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)]!;
const some = <T>(xs: readonly T[], max: number): T[] => {
  const n = Math.floor(rand() * (max + 1));
  const pool = [...xs];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]!);
  return out;
};

const FIRST = [
  "Anna", "Maria", "John", "Jane", "Max", "Erika", "Ola", "Kari", "Jan", "Janez", "Marija", "Ivan", "Petra", "Marko", "Ana", "José",
  "Juan", "Carlos", "Sofia", "Emma", "Lucas", "Noah", "Mia", "Leon", "Hanna", "Sven", "Matti", "Maija", "Hanako", "Taro", "Kenji", "Wei",
  "Ali", "Fatima", "Omar", "Grace", "Thabo", "Raj", "Pedro", "João", "Rita", "Tiago", "Elena", "Luca", "Giulia", "Marie", "Jean", "Pierre",
  "David", "Daniel", "Laura", "Paul", "Peter", "Eva", "Tom", "Nina", "Sara", "Lena", "Oscar", "Zoë",
];
const LAST = [
  "Doe", "Smith", "Bloggs", "Novak", "Horvat", "Kovač", "Mustermann", "Müller", "Schmidt", "Rossi", "Bianchi", "Dupont", "Martin", "García",
  "Pérez", "López", "Silva", "Santos", "Costa", "Jansen", "de Vries", "Nordmann", "Hansen", "Andersson", "Svensson", "Virtanen", "Nagy",
  "Popescu", "Petrović", "Yılmaz", "Cohen", "Hassan", "Kim", "Lee", "Park", "Wang", "Li", "Zhang", "Chen", "Yamada", "Sato", "Suzuki",
  "Nguyen", "Singh", "Kumar", "Mwangi", "Okafor", "Brown", "Wilson", "Taylor",
];
const ROLES = [
  "Founder", "Co-founder & CEO", "CTO", "Product designer", "Software engineer", "Partner", "Principal", "Angel investor", "Head of Growth",
  "PhD student", "Professor", "Marketing lead", "Data scientist", "Architect", "Doctor", "Lawyer", "Photographer", "Chef", "Journalist",
  "Product manager", "Engineering manager", "Sales director", "Consultant", "Teacher", "Researcher",
];
const COMPANIES = [
  "Stripe", "Figma", "Anthropic", "Notion", "Linear", "Vercel", "Index Ventures", "Sequoia",
  "ETH Lab", "ETH Zürich", "McKinsey", "Google", "Apple", "Spotify", "Revolut", "Klarna", "N26", "Wise",
  "Booking.com", "Bolt", "Miro",
];
const TAGS = ["college friends", "old colleagues", "book club", "neighbours", "running club", "climbing crew", "conference speakers", "design community", "startup founders", "family friends"];
const WARMTH = [
  ["inner", 0.08],
  ["active", 0.42],
  ["dormant", 0.32],
  ["archive", 0.18],
] as const;
const CIRCLES = ["nice_to_know", "hang_out_more", "potential_close", null, null] as const;

function weighted<T extends string>(table: readonly (readonly [T, number])[]): T {
  let r = rand();
  for (const [v, w] of table) if ((r -= w) <= 0) return v;
  return table[table.length - 1]![0];
}

/** The owner: DEV_EMAIL when set, else the instance's single profile (whatever `pnpm bootstrap` created). */
async function ownerId(): Promise<string> {
  const rows = email ? await sql<{ id: string }[]>`select id from auth.users where email = ${email}` : await sql<{ id: string }[]>`select id from profiles`;
  if (rows.length !== 1) throw new Error(email ? `No auth user ${email}` : `Expected one profile, found ${rows.length}: run pnpm bootstrap (or set DEV_EMAIL)`);
  return rows[0]!.id;
}

async function seed(count: number) {
  const owner = await ownerId();

  // ~70 home cities: Europe's biggest, plus the largest one or two per country elsewhere so every continent shows up on the globe.
  const cities = await sql<{ id: number }[]>`
    (select id from cities where country_code in ('SI','HR','AT','DE','IT','GB','FR','ES','NL','CH','DK','SE','NO','FI','PT','PL','CZ','HU','BE','IE','GR','RS')
      order by population desc nulls last limit 48)
    union
    (select id from (
        select id, country_code, row_number() over (partition by country_code order by population desc nulls last) as rank from cities
        where country_code in ('US','CA','MX','BR','AR','CO','JP','KR','SG','IN','AE','IL','TR','ZA','KE','NG','EG','AU')) c
      where rank <= case when country_code in ('US','IN','BR','JP','AU') then 2 else 1 end)`;
  await sql`
    insert into locations (owner_id, name, admin, country, country_code, lat, lng, timezone, city_id, source)
    select ${owner}, c.name, c.admin, c.country, c.country_code, c.lat, c.lng, c.timezone, c.id, ${SOURCE}
    from cities c where c.id = any(${cities.map((c) => c.id)}::int[])
    on conflict (owner_id, city_id) do nothing`;
  const locs = await sql<{ id: string; cc: string }[]>`
    select id, country_code as cc from locations where owner_id = ${owner} and city_id = any(${cities.map((c) => c.id)}::int[])`;
  // Skew towards a handful of "home" cities so facet counts look realistic.
  const weightedLocs = [...locs, ...locs.filter((l) => ["SI", "AT", "GB", "DE"].includes(l.cc)).flatMap((l) => [l, l, l])];

  for (const name of TAGS) {
    await sql`insert into tags (owner_id, name) values (${owner}, ${name}) on conflict do nothing`;
  }
  const tagRows = await sql<{ id: string }[]>`select id from tags where owner_id = ${owner} and name = any(${TAGS})`;
  const catRows = await sql<{ id: string }[]>`select id from categories where owner_id = ${owner}`;
  const actRows = await sql<{ id: string }[]>`select id from activities where owner_id = ${owner}`;

  // Unique names, also against people already there (e.g. scripts/dev/seed-demo.ts), so People shows no "Possible duplicates".
  const nameKey = (name: string) => name.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().split(/\s+/).sort().join(" ");
  const taken = new Set((await sql<{ name: string }[]>`select display_name as name from people where owner_id = ${owner} and deleted_at is null`).map((r) => nameKey(r.name)));
  const uniqueName = (): [string, string] => {
    let name: [string, string];
    let tries = 0;
    do name = [pick(FIRST), pick(LAST)];
    while (taken.has(nameKey(name.join(" "))) && ++tries < 50);
    taken.add(nameKey(name.join(" ")));
    return name;
  };

  const now = Date.now();
  const DAY = 86_400_000;
  const people = Array.from({ length: count }, () => {
    const [first, last] = uniqueName();
    const hasRole = rand() < 0.85;
    const warmth = weighted(WARMTH);
    return {
      owner_id: owner,
      display_name: `${first} ${last}`,
      first_name: first,
      last_name: last,
      headline: hasRole ? pick(ROLES) : null,
      company: hasRole && rand() < 0.8 ? pick(COMPANIES) : null,
      home_location_id: rand() < 0.9 ? pick(weightedLocs).id : null,
      warmth,
      circle: pick(CIRCLES),
      // The inner circle is seen often (< 60 days), so Today's "Reconnect" isn't filled with seeded rows.
      last_interaction_at:
        warmth === "inner" ? new Date(now - Math.floor(rand() * 50 * DAY)) : rand() < 0.85 ? new Date(now - Math.floor(rand() ** 2 * 720 * DAY)) : null,
      next_followup_at: rand() < 0.2 ? new Date(now + Math.floor((rand() * 90 - 10) * DAY)) : null,
      source_kind: SOURCE,
      created_at: new Date(now - Math.floor(rand() * 900 * DAY)),
    };
  });

  const inserted = await sql<{ id: string }[]>`insert into people ${sql(people)} returning id`;
  const pc: { person_id: string; category_id: string; owner_id: string }[] = [];
  const pa: { person_id: string; activity_id: string; owner_id: string }[] = [];
  const pt: { person_id: string; tag_id: string; owner_id: string }[] = [];
  for (const { id } of inserted) {
    for (const c of some(catRows, 2)) pc.push({ person_id: id, category_id: c.id, owner_id: owner });
    for (const a of some(actRows, 4)) pa.push({ person_id: id, activity_id: a.id, owner_id: owner });
    if (rand() < 0.45) for (const t of some(tagRows, 2)) pt.push({ person_id: id, tag_id: t.id, owner_id: owner });
  }
  if (pc.length) await sql`insert into person_categories ${sql(pc)} on conflict do nothing`;
  if (pa.length) await sql`insert into person_activities ${sql(pa)} on conflict do nothing`;
  if (pt.length) await sql`insert into person_tags ${sql(pt)} on conflict do nothing`;
  console.log(`Seeded ${inserted.length} people (${locs.length} cities, ${pc.length} category, ${pa.length} activity, ${pt.length} tag links).`);
}

async function clean() {
  const owner = await ownerId();
  const del = await sql`delete from people where owner_id = ${owner} and source_kind = ${SOURCE}`;
  // Seed-created locations/tags, only where nothing real points at them any more.
  const locs = await sql`
    delete from locations l where l.owner_id = ${owner} and l.source = ${SOURCE}
      and not exists (select 1 from people p where p.home_location_id = l.id or p.met_location_id = l.id)`;
  const tags = await sql`
    delete from tags t where t.owner_id = ${owner} and t.name = any(${TAGS})
      and not exists (select 1 from person_tags pt where pt.tag_id = t.id)`;
  console.log(`Removed ${del.count} people, ${locs.count} locations, ${tags.count} tags.`);
}

const [cmd = "seed", n = "600"] = process.argv.slice(2);
(cmd === "clean" ? clean() : seed(Number(n)))
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
