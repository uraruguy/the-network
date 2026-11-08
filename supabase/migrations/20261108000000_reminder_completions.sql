-- Follow-up history: one row each time a follow-up is marked done, repeating ones included (a
-- repeating reminder rolls forward in place, so its past occurrences only live here). The optional
-- note written when marking it done is a regular note on the person, linked by note_id.
-- Additive only; safe to re-run.

create table if not exists reminder_completions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  person_id uuid not null references people (id) on delete cascade,
  reminder_id uuid references reminders (id) on delete set null,
  note_id uuid references notes (id) on delete set null,
  -- What the follow-up said, when it was due and how it repeated, as of completion.
  message text,
  due_at timestamptz not null,
  recurrence recurrence not null default 'none',
  -- Where it was marked done: the app, the digest e-mail, or the assistant (chat / MCP).
  via text check (via in ('app', 'email', 'assistant')),
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminder_completions_person_idx on reminder_completions (person_id, completed_at desc);
create index if not exists reminder_completions_owner_idx on reminder_completions (owner_id, completed_at desc);
create index if not exists reminder_completions_reminder_idx on reminder_completions (reminder_id);

-- One-off follow-ups already marked done become the start of each person's history.
insert into reminder_completions (owner_id, person_id, reminder_id, message, due_at, recurrence, completed_at, created_at, updated_at)
select r.owner_id, r.person_id, r.id, r.message, r.due_at, r.recurrence, r.done_at, r.done_at, r.done_at
from reminders r
where r.status = 'done'
  and r.done_at is not null
  and not exists (select 1 from reminder_completions c where c.reminder_id = r.id);

alter table reminder_completions enable row level security;
drop policy if exists owner_all on reminder_completions;
create policy owner_all on reminder_completions for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
revoke all on reminder_completions from anon, authenticated;

drop trigger if exists touch_updated_at on reminder_completions;
create trigger touch_updated_at before update on reminder_completions for each row execute function public.touch_updated_at();
