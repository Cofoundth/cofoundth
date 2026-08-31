-- ============================================================================
-- Meetups — admin-curated community events with member RSVP. ADDITIVE.
--
-- v1 scope (CLAUDE.md community-first roadmap — "small online events", "first
-- in-person event in Bangkok"): an admin authors meetups; any signed-in member
-- sees them and RSVPs (going / cancel). Optional capacity, plus an
-- "Add to Google Calendar" link generated app-side. No public page — meetups
-- are members-only, so RLS SELECT is limited to authenticated + non-draft rows.
--
-- Writes to `meetups` are admin-only and go through service-role server actions
-- (which verify isAdminUser() first), exactly like the org membership writes in
-- 0049 — so there is intentionally NO insert/update/delete policy here; RLS
-- denies those by default and only the service role (which bypasses RLS) writes.
-- ============================================================================

create table public.meetups (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  description text,
  format      text not null default 'in_person'
              check (format in ('in_person','online')),
  location    text,                                          -- venue (in_person)
  online_url  text,                                          -- meeting link (online)
  starts_at   timestamptz not null,
  ends_at     timestamptz,
  capacity    int check (capacity is null or capacity > 0),  -- null = unlimited
  status      text not null default 'published'
              check (status in ('draft','published','cancelled')),
  created_by  uuid not null references public.profiles(id) on delete restrict,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index meetups_starts_at_idx on public.meetups(starts_at);
create index meetups_status_idx    on public.meetups(status);

create table public.meetup_rsvps (
  meetup_id  uuid not null references public.meetups(id)  on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  -- Only 'going' is stored in v1; un-RSVP is a DELETE. The column + check are
  -- kept so a future 'waitlisted' / 'declined' state is an additive change.
  status     text not null default 'going' check (status in ('going')),
  created_at timestamptz not null default now(),
  primary key (meetup_id, user_id)
);
create index meetup_rsvps_user_idx on public.meetup_rsvps(user_id);

-- ---------------------------------- RLS ------------------------------------
alter table public.meetups      enable row level security;
alter table public.meetup_rsvps enable row level security;

-- meetups: members see everything except drafts. Admin authoring runs through
-- service-role server actions, so there is no write policy (RLS denies writes).
-- (auth.uid() wrapped in a subselect per the project's RLS perf convention, 0014.)
create policy meetups_select_non_draft on public.meetups
  for select to authenticated
  using (status <> 'draft');

-- meetup_rsvps: rosters are readable (the detail page shows who's going).
-- A member inserts / removes ONLY their own RSVP.
create policy meetup_rsvps_select_authenticated on public.meetup_rsvps
  for select to authenticated using (true);

create policy meetup_rsvps_insert_self on public.meetup_rsvps
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy meetup_rsvps_delete_self on public.meetup_rsvps
  for delete to authenticated
  using (user_id = (select auth.uid()));
