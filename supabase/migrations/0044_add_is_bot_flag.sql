-- Seed/demo account flag — surfaced as a [BOT] badge in the admin Users panel
-- only. Locked from self-edit (like is_admin / verified).
alter table public.profiles
  add column if not exists is_bot boolean not null default false;

revoke update (is_bot) on public.profiles from anon, authenticated;

comment on column public.profiles.is_bot is
  'Seed/demo account flag — surfaced as a [BOT] badge in the admin Users panel only.';
