-- Indexes for hot read paths that were scanning.
-- 1. note_mentions is keyed (note_id, person_id), so "notes that mention this person" (every
--    profile open) and the person_id foreign-key cascade scanned the whole table.
-- 2. The notes substring fallback matches content_text OR title; only content_text had a trigram
--    index, so the OR fell back to scanning the owner's notes.
-- 3. Recently deleted looks up the person.merge audit entry per deleted person; without this it
--    walked the owner's whole audit log (every sign-in and assistant tool call) for each one.
-- Additive; safe to re-run.

create index if not exists note_mentions_person_idx on note_mentions (person_id);
create index if not exists notes_title_trgm_idx on notes using gin (title gin_trgm_ops);
create index if not exists audit_log_merge_drop_idx on audit_log (owner_id, ((meta -> 'drop' ->> 'id')), at desc) where action = 'person.merge';
