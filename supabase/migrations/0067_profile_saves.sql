-- Saved founders — the reference product's heart-on-card ("Save member").
-- A private bookmark list; nobody is notified, nothing is public.
create table public.profile_saves (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, profile_id)
);
create index profile_saves_user_idx on public.profile_saves(user_id);

alter table public.profile_saves enable row level security;
-- Own rows only, in every direction — a save is private to the saver.
create policy profile_saves_select_own on public.profile_saves
  for select to authenticated using (user_id = (select auth.uid()));
create policy profile_saves_insert_self on public.profile_saves
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy profile_saves_delete_self on public.profile_saves
  for delete to authenticated using (user_id = (select auth.uid()));
