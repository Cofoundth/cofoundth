-- Soft-hide (reversible) for moderation, distinct from hard delete.
alter table public.profiles
  add column if not exists suspended boolean not null default false;
alter table public.forum_posts
  add column if not exists hidden boolean not null default false;

-- Moderation flags are admin-only — users must not flip their own.
revoke update (suspended) on public.profiles from anon, authenticated;
revoke update (hidden) on public.forum_posts from anon, authenticated;
