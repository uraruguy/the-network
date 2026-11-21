-- City search ranking and speed.
-- 1. Exact name matches come first ("Bled" before "Bledzew"), then population.
-- 2. An optional preferred country (the owner's home) counts its towns' population 1000×, so its
--    small towns aren't buried under big foreign cities sharing their prefix. Measured on the
--    seeded data: every Slovenian place shows within 3 typed letters (26 needed 5+ before), and
--    world cities over 1M need 2.20 letters on average instead of 2.15.
-- 3. Trigram indexes serve the prefix match (ilike can't use the btree), so the picker no longer
--    scans every city on each keystroke.
-- Additive; safe to re-run.

create index if not exists cities_ascii_name_trgm_idx on cities using gin (ascii_name gin_trgm_ops);
create index if not exists cities_name_trgm_idx on cities using gin (name gin_trgm_ops);

-- A new parameter makes a new overload: drop the two-argument one so calls stay unambiguous.
drop function if exists public.search_cities(text, int);
create or replace function public.search_cities(q text, lim int default 8, prefer text default null)
returns setof cities language sql stable as $$
  select * from cities
  where ascii_name ilike unaccent(q) || '%' or name ilike q || '%'
  order by
    (lower(ascii_name) = lower(unaccent(q)) or lower(name) = lower(q)) desc,
    coalesce(population, 0)::bigint * (case when country_code = prefer then 1000 else 1 end) desc,
    id
  limit lim;
$$;

-- Like every function of ours: not callable through the Data API.
revoke execute on function public.search_cities(text, int, text) from public, anon, authenticated;
grant execute on function public.search_cities(text, int, text) to service_role;
