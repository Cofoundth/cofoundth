-- 0078: make the moderation / privilege flags actually unwritable by the
-- member they are about.
--
-- ── WHAT WAS BROKEN, AND FOR HOW LONG ─────────────────────────────────────
-- Three migrations tried to lock these columns and all three were no-ops:
--
--   0042: revoke update (is_admin, verified) on public.profiles    from authenticated;
--   0043: revoke update (suspended)          on public.profiles    from authenticated;
--   0043: revoke update (hidden)             on public.forum_posts from authenticated;
--   0044: revoke update (is_bot)             on public.profiles    from authenticated;
--
-- `authenticated` holds a TABLE-level UPDATE privilege on both tables (granted
-- in 0001 and never dropped — 0077's header records re-verifying exactly that
-- against the live database), and in Postgres a table-level grant OUTRANKS a
-- column-level revoke. This is the identical mistake 0048 was written to fix
-- for SELECT: "0047 was a no-op: a TABLE-level SELECT grant to `authenticated`
-- covers every column, so the column-level REVOKE never actually restricted
-- `email`". Nobody applied that lesson to UPDATE. `grep -rn "revoke update"
-- supabase/migrations/` finds the four lines above and no table-level revoke.
--
-- The RLS update policies carry no column guard either — `profiles_update_own`
-- (0001_initial_schema.sql:259) is `using (auth.uid() = id) with check
-- (auth.uid() = id)`, and `forum_posts_update_own` (0002_community_forum.sql:38)
-- is the same shape on `author_id`. So any signed-in member could PATCH their
-- own row straight at PostgREST and set `is_admin = true`, `verified = true`,
-- `suspended = false`, `is_bot = false`, or `forum_posts.hidden = false` —
-- walking out of a suspension, forging a badge, granting themselves the admin
-- panel, or restoring a post an admin had hidden.
--
-- ── WHY THIS IS URGENT NOW ────────────────────────────────────────────────
-- /products became a PUBLIC page. Its author gate (publicProductAuthors in
-- lib/posts.ts) is the only thing standing between a moderated account and
-- anonymous traffic plus app/sitemap.ts, and it filters on `suspended`,
-- `is_bot` and `account_type` — columns the filtered account could write.
-- Hiding a product likewise now removes it from a crawlable shelf, and its
-- author could put it back. The hole is pre-existing; the public shelf is what
-- made it load-bearing.
--
-- ── WHY A TRIGGER AND NOT 0048'S GRANT PATTERN ────────────────────────────
-- 0048's pattern is `revoke <priv> on <table>` plus `grant <priv> (<named
-- columns>)`. It is the right shape for SELECT on `profiles`, and 0074 used it
-- for UPDATE on `messages`, where exactly three columns are writable. It is
-- the wrong shape here, for two concrete reasons:
--
--   1. THE LIST POINTS THE WRONG WAY. 45 of `profiles`' 49 columns are
--      legitimately self-writable (settings, onboarding, avatar, locale, the
--      role carry); 4 are not. The grant pattern makes us enumerate the 45 and
--      amend that list in every future migration that adds a column. This repo
--      has a measured track record on exactly that: 0050, 0061, 0062 and 0077
--      all exist to add a forgotten per-column grant, and 0061's header records
--      the symptom — PostgREST rejects the WHOLE request when the payload
--      touches one ungranted column, so a forgotten line renders as a silently
--      empty page or a dead form, never as an error pointing back here.
--   2. IT WOULD BE DEFEATED BY A FUTURE `grant update on profiles`, the same
--      way 0001's grant defeated 0042/0043/0044. The guard below is not a
--      privilege, so re-granting the table cannot re-open it.
--
-- The protected set, by contrast, is five columns and stable. A BEFORE UPDATE
-- guard also has a property the grant pattern does not: it refuses only a
-- CHANGE. A payload that happens to carry `suspended: false` at its current
-- value still succeeds, where a column revoke would 403 the whole request. No
-- current payload does — settings, onboarding, avatar, locale and the role
-- carry were each read before this was written — but "no caller does today" is
-- how 0061 happened.
--
-- ── WHAT IS DELIBERATELY *NOT* PROTECTED ──────────────────────────────────
-- `profiles.account_type` is SELF-WRITABLE ON PURPOSE and must stay that way.
-- Two user-session writes depend on it: app/actions/account-role.ts:96
-- (explorer -> founder) and app/auth/callback/route.ts:159 (the OAuth `?role=`
-- carry), both through the cookie client under `profiles_update_own`. The role
-- is self-selected at signup, so there is nothing there to protect, and
-- account-role.ts says so in writing. Read lib/posts.ts's `account_type =
-- 'founder'` pin as a DECLARATION filter (an investor or explorer has not
-- declared themselves a maker), never as a security boundary; the boundary is
-- the four flags below.
--
-- ── SCOPE ─────────────────────────────────────────────────────────────────
-- `current_user in ('anon', 'authenticated')` is the whole browser-reachable
-- surface: PostgREST does `set local role` to one of those two, for the
-- publishable key and for a user JWT respectively. It is a denylist of the two
-- untrusted roles rather than an allowlist of trusted ones, so a restore, a
-- dashboard operation or a migration running as `postgres` / `supabase_admin`
-- is never blocked — and the service role keeps writing these flags, which is
-- exactly how the admin tools already do it (lib/admin-actions.ts and
-- app/(app)/admin/verifications/actions.ts both go through createAdminClient()).
--
-- The default `security invoker` is REQUIRED here, not left off by accident:
-- the guard has to see the real caller's role. `set search_path = public` pins
-- resolution regardless.

create or replace function public.guard_profile_admin_flags()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.is_admin  is distinct from old.is_admin
    or new.verified  is distinct from old.verified
    or new.suspended is distinct from old.suspended
    or new.is_bot    is distinct from old.is_bot then
      raise exception
        'profiles.is_admin / verified / suspended / is_bot are admin-only'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_admin_flags on public.profiles;
create trigger profiles_guard_admin_flags
before update on public.profiles
for each row execute function public.guard_profile_admin_flags();

create or replace function public.guard_post_hidden_flag()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated')
     and new.hidden is distinct from old.hidden then
    raise exception 'forum_posts.hidden is admin-only'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists forum_posts_guard_hidden on public.forum_posts;
create trigger forum_posts_guard_hidden
before update on public.forum_posts
for each row execute function public.guard_post_hidden_flag();

comment on function public.guard_profile_admin_flags() is
  'Refuses a self-service change to profiles.is_admin / verified / suspended / is_bot. Replaces the no-op column-level UPDATE revokes in 0042/0043/0044 (a table-level grant outranks a column-level revoke - see 0048). account_type is deliberately NOT guarded: it is self-selected (app/actions/account-role.ts).';

comment on function public.guard_post_hidden_flag() is
  'Refuses a self-service change to forum_posts.hidden. Replaces the no-op column-level UPDATE revoke in 0043. Load-bearing since /products became public: lib/posts.ts filters hidden=false on a crawlable page.';

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- The four revokes above stay in the history as a record of the attempt. They
-- are harmless no-ops and deleting them would erase the lesson. What to run
-- once this is applied, in the SQL editor, against a real profile id:
--
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"<that profile id>"}';
--   update public.profiles set suspended = false where id = '<that profile id>';
--   -- expected: ERROR 42501  profiles.is_admin / verified / suspended / is_bot ...
--   update public.profiles set location = 'Ladprao' where id = '<that profile id>';
--   -- expected: UPDATE 1 — an ordinary self-write is untouched.
--   reset role;
--
-- And the same two shapes on forum_posts.hidden vs forum_posts.content.
