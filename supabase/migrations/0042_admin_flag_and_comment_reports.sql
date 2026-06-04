-- DB-driven admin flag so admins can be granted without changing env vars /
-- redeploying. Honored alongside the ADMIN_EMAILS allowlist (see lib/admin.ts).
alter table public.profiles
  add column if not exists is_admin boolean not null default false;

-- Allow reporting comments too (enum already had profile/post/message).
alter type report_kind add value if not exists 'comment';

-- Prevent privilege escalation / badge forgery: users must not set their own
-- is_admin or verified. RLS is row-level and can't gate columns, so revoke
-- column-level UPDATE. Only the service role (admin tools) can change them.
revoke update (is_admin, verified) on public.profiles from anon, authenticated;
