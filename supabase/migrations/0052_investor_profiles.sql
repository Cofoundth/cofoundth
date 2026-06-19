-- Investor-specific profile, kept SEPARATE from the founder `profiles` fields.
-- Investors never fill the founder/company onboarding; they fill this instead.
-- (The full investor experience — browsing founders, deal flow — is Phase 2.)

create table public.investor_profiles (
  user_id          uuid primary key references public.profiles(id) on delete cascade,
  investor_type    text,           -- angel | vc | corporate | family_office | syndicate | other
  firm_name        text,
  focus_industries text[] not null default '{}',
  stages           text[] not null default '{}',  -- pre_seed | seed | series_a | growth
  ticket_size      text,
  thesis           text,
  location         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.investor_profiles enable row level security;

-- Any signed-in user can read (for a future investor directory); you only
-- write your own row.
create policy investor_profiles_select on public.investor_profiles
  for select to authenticated using (true);
create policy investor_profiles_insert_self on public.investor_profiles
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy investor_profiles_update_self on public.investor_profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.investor_profiles to authenticated;
