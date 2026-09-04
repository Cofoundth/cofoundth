-- 0069: profile blocks — Settings > Privacy & safety.
-- "Members you've blocked won't see you": the pair disappears from each
-- other's directories, dashboards, tickers, and profiles, and neither can
-- open a new interest toward the other. Enforcement lives server-side in
-- lib/blocking.ts (both directions need service role — RLS below keeps a
-- block list private to the person who made it, so "who blocked me" is
-- invisible to the client on purpose).

create table public.profile_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.profile_blocks enable row level security;

-- Own rows only, every direction. Being blocked is never readable.
create policy profile_blocks_select_own on public.profile_blocks
  for select using (blocker_id = (select auth.uid()));
create policy profile_blocks_insert_own on public.profile_blocks
  for insert with check (blocker_id = (select auth.uid()));
create policy profile_blocks_delete_own on public.profile_blocks
  for delete using (blocker_id = (select auth.uid()));

-- Reverse-direction lookups run under service role and need this index.
create index profile_blocks_blocked_idx on public.profile_blocks (blocked_id);
