-- CoFound.th Phase 1 schema
-- Apply via Supabase Dashboard → SQL Editor, or `supabase db push` once the CLI is wired up.

----------------------------------------------------------------------
-- 1. Enums
----------------------------------------------------------------------

create type profile_role as enum (
  'technical',
  'business',
  'product',
  'marketing',
  'finance',
  'domain_expert'
);

create type profile_intent as enum ('idea', 'open', 'explore');

create type profile_stage as enum (
  'exploring',
  'building',
  'traction',
  'raising'
);

create type profile_commitment as enum (
  'full_time',
  'part_time',
  'side_project'
);

create type profile_runway as enum (
  'three_months',
  'six_months',
  'twelve_months',
  'eighteen_plus'
);

create type profile_experience as enum ('first_time', 'one_to_two', 'three_plus');

create type interest_status as enum ('pending', 'accepted', 'declined');

----------------------------------------------------------------------
-- 2. Tables
----------------------------------------------------------------------

create table profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text         not null,
  age           integer,
  location      text,
  photo_url     text,
  linkedin_url  text,

  i_am          profile_role,
  intent        profile_intent,
  looking_for   profile_role[]         not null default '{}',

  industry      text[]                 not null default '{}',
  stage         profile_stage,
  commitment    profile_commitment,
  runway        profile_runway,
  experience    profile_experience,

  pitch         text,
  why_this      text,
  skills        text[]                 not null default '{}',

  verified      boolean                not null default false,
  onboarded     boolean                not null default false,

  created_at    timestamptz            not null default now(),
  updated_at    timestamptz            not null default now(),

  -- Mandatory pitch length once filled (see CLAUDE.md §Profile Required Fields)
  constraint pitch_length check (
    pitch is null
    or char_length(pitch) between 200 and 500
  ),
  constraint age_sanity check (age is null or age between 13 and 120),
  constraint linkedin_url_format check (
    linkedin_url is null or linkedin_url ~* '^https?://([a-z]+\.)?linkedin\.com/.+'
  )
);

create table interests (
  id                uuid primary key default gen_random_uuid(),
  from_profile_id   uuid not null references profiles (id) on delete cascade,
  to_profile_id     uuid not null references profiles (id) on delete cascade,
  note              text,
  status            interest_status not null default 'pending',
  created_at        timestamptz not null default now(),

  unique (from_profile_id, to_profile_id),
  constraint no_self_interest check (from_profile_id <> to_profile_id)
);

create table matches (
  id              uuid primary key default gen_random_uuid(),
  profile_a_id    uuid not null references profiles (id) on delete cascade,
  profile_b_id    uuid not null references profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),

  -- Canonical ordering so (a,b) and (b,a) can't both exist
  constraint canonical_order check (profile_a_id < profile_b_id),
  unique (profile_a_id, profile_b_id)
);

create table messages (
  id            uuid primary key default gen_random_uuid(),
  match_id      uuid not null references matches (id) on delete cascade,
  sender_id     uuid not null references profiles (id) on delete cascade,
  content       text not null,
  read_at       timestamptz,
  created_at    timestamptz not null default now(),

  constraint content_not_empty check (char_length(trim(content)) > 0)
);

create table profile_views (
  id            uuid primary key default gen_random_uuid(),
  viewer_id     uuid not null references profiles (id) on delete cascade,
  viewed_id     uuid not null references profiles (id) on delete cascade,
  viewed_at     timestamptz not null default now(),

  constraint no_self_view check (viewer_id <> viewed_id)
);

----------------------------------------------------------------------
-- 3. Indexes (tuned for the directory + matching queries)
----------------------------------------------------------------------

create index profiles_i_am_idx        on profiles (i_am);
create index profiles_intent_idx      on profiles (intent);
create index profiles_stage_idx       on profiles (stage);
create index profiles_commitment_idx  on profiles (commitment);
create index profiles_onboarded_idx   on profiles (onboarded);
create index profiles_looking_for_idx on profiles using gin (looking_for);
create index profiles_industry_idx    on profiles using gin (industry);
create index profiles_skills_idx      on profiles using gin (skills);

create index interests_from_idx   on interests (from_profile_id);
create index interests_to_idx     on interests (to_profile_id);
create index interests_status_idx on interests (status);

create index matches_a_idx on matches (profile_a_id);
create index matches_b_idx on matches (profile_b_id);

create index messages_match_idx     on messages (match_id, created_at);
create index messages_sender_idx    on messages (sender_id);
create index messages_unread_idx    on messages (match_id) where read_at is null;

create index profile_views_viewed_idx on profile_views (viewed_id, viewed_at desc);

----------------------------------------------------------------------
-- 4. Triggers
----------------------------------------------------------------------

-- updated_at auto-bump
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on profiles
for each row execute function set_updated_at();

-- Auto-create a profile row when an auth user is created.
-- Fills full_name from the signup metadata if provided.
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function handle_new_user();

-- When an interest is inserted, if the reverse direction already exists
-- → create the match (canonical ordering enforced by check constraint).
create or replace function handle_mutual_interest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  if exists (
    select 1
    from public.interests
    where from_profile_id = new.to_profile_id
      and to_profile_id = new.from_profile_id
  ) then
    if new.from_profile_id < new.to_profile_id then
      a := new.from_profile_id;
      b := new.to_profile_id;
    else
      a := new.to_profile_id;
      b := new.from_profile_id;
    end if;

    insert into public.matches (profile_a_id, profile_b_id)
    values (a, b)
    on conflict do nothing;
  end if;
  return new;
end;
$$;

create trigger on_interest_insert
after insert on interests
for each row execute function handle_mutual_interest();

----------------------------------------------------------------------
-- 5. Row-Level Security
----------------------------------------------------------------------

alter table profiles      enable row level security;
alter table interests     enable row level security;
alter table matches       enable row level security;
alter table messages      enable row level security;
alter table profile_views enable row level security;

-- profiles --------------------------------------------------------------

create policy "profiles_select_authenticated"
  on profiles for select
  to authenticated
  using (true);

create policy "profiles_insert_own"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- interests -------------------------------------------------------------

create policy "interests_select_party"
  on interests for select
  to authenticated
  using (auth.uid() = from_profile_id or auth.uid() = to_profile_id);

create policy "interests_insert_self"
  on interests for insert
  to authenticated
  with check (auth.uid() = from_profile_id);

create policy "interests_update_recipient"
  on interests for update
  to authenticated
  using (auth.uid() = to_profile_id)
  with check (auth.uid() = to_profile_id);

-- matches ---------------------------------------------------------------
-- Inserts happen via the mutual-interest trigger (security definer), so
-- we don't expose an INSERT policy to clients.

create policy "matches_select_party"
  on matches for select
  to authenticated
  using (auth.uid() = profile_a_id or auth.uid() = profile_b_id);

-- messages --------------------------------------------------------------

create policy "messages_select_in_match"
  on messages for select
  to authenticated
  using (
    exists (
      select 1
      from matches m
      where m.id = messages.match_id
        and (m.profile_a_id = auth.uid() or m.profile_b_id = auth.uid())
    )
  );

create policy "messages_insert_in_match"
  on messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from matches m
      where m.id = messages.match_id
        and (m.profile_a_id = auth.uid() or m.profile_b_id = auth.uid())
    )
  );

create policy "messages_update_recipient_read"
  on messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1
      from matches m
      where m.id = messages.match_id
        and (m.profile_a_id = auth.uid() or m.profile_b_id = auth.uid())
    )
  );

-- profile_views ---------------------------------------------------------

create policy "profile_views_select_viewed"
  on profile_views for select
  to authenticated
  using (auth.uid() = viewed_id);

create policy "profile_views_insert_self"
  on profile_views for insert
  to authenticated
  with check (auth.uid() = viewer_id);

----------------------------------------------------------------------
-- 6. Storage bucket for profile photos
----------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Avatars are public-readable so profile cards can render without signed URLs.
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- Users can upload only into their own folder: avatars/{user_id}/...
create policy "avatars_insert_own_folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_update_own_folder"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_delete_own_folder"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
