-- ============================================================================
-- Third account role: 'explorer' — somebody who is here to TRY what the
-- community builds and give feedback, not to build (yet).
--
-- The pivot is one level EARLIER than "startup": people making an app/game/tool
-- before any company exists, who want someone to try it. /products is that
-- surface, and an explorer is the demand side of it.
--
-- WHY THE DB VALUE IS 'explorer' AND NOT 'user': `user` already means "the
-- authenticated session user" in essentially every file in this repo
-- (`const user = await getUser()`), so `account_type = 'user'` reads as a
-- tautology and `isUserAccount(supabase, user.id)` is unreadable. The
-- USER-FACING LABEL is "Explorer" and is the owner's to rename; this value is
-- the thing that must not be `user`.
--
-- 'investor' IS KEPT. There are 6 real investor rows in production (verified
-- before writing this migration: 111 founder / 6 investor). This migration
-- WIDENS the CHECK and never narrows it. Hiding the investor OPTION from the
-- signup picker is an application-layer feature flag (FEATURES.investorSignup),
-- not a schema change — /investor, /funding, INVESTOR_HOME and every investor
-- gate stay live for those 6 accounts.
--
-- NOTE (unchanged from 0050): "admin" is intentionally NOT an account_type.
-- Admin is a *granted* privilege (the is_admin flag), never self-selected.
--
-- Idempotent throughout: `if not exists` / drop-then-add / `or replace`.
-- ============================================================================

----------------------------------------------------------------------
-- 1. Widen account_type_check — ADD 'explorer', keep 'investor'
----------------------------------------------------------------------
-- Dropped and re-added exactly the way 0050 does it: Postgres has no
-- "alter constraint" for a CHECK body.
alter table public.profiles
  drop constraint if exists account_type_check;
alter table public.profiles
  add constraint account_type_check
  check (account_type in ('founder', 'investor', 'explorer'));

----------------------------------------------------------------------
-- 2. role_chosen — was the role EXPLICITLY picked, or is it the default?
----------------------------------------------------------------------
-- The problem this column exists to solve: components/auth/GoogleSignInButton
-- is a SIBLING of <SignupForm>, so the role a visitor picks never reaches the
-- OAuth round trip. handle_new_user sees no account_type in
-- raw_user_meta_data and defaults to 'founder' — today that silently makes
-- every OAuth "Investor" signup a permanent founder, and with an explorer role
-- it would make the explorer role unreachable for every OAuth signup.
--
-- The fix carries the picked role through redirectTo as `&role=<value>` and
-- lets /auth/callback apply it ONCE. `role_chosen` is the idempotence latch:
-- apply the query param only while it is false, then set it true. Every later
-- sign-in is a no-op, so a stray or stale ?role= cannot rewrite a settled role.
-- (Tampering is uninteresting — the role is self-selected anyway — but the
-- application still validates the value against the three allowed strings, and
-- refuses 'investor' while FEATURES.investorSignup is false.)
alter table public.profiles
  add column if not exists role_chosen boolean not null default false;

comment on column public.profiles.role_chosen is
  'True once the account_type was EXPLICITLY picked (email/password signup, or an OAuth signup whose ?role= was applied by /auth/callback). False means the role is still the handle_new_user default, so a first explicit choice may still be recorded. One-way: never set back to false.';

-- SELECT grant is MANDATORY and is the trap 0050's header documents: 0048
-- replaced the table-level SELECT grant to `authenticated` with a per-column
-- grant, so a column added later is unreadable by every signed-in user until
-- named here. PostgREST rejects the WHOLE request when the select list touches
-- one ungranted column (0061/0062 both record the silent total failure that
-- causes), so /auth/callback's `select role_chosen` would error, not return
-- null.
grant select (role_chosen) on public.profiles to authenticated;

-- NO column-level UPDATE grant is needed, and this is deliberate, not an
-- oversight. Verified against the live database before writing this line:
-- `authenticated` still holds a TABLE-LEVEL UPDATE privilege on
-- public.profiles (information_schema.table_privileges), because 0048 dropped
-- only the table-level SELECT. A table-level grant covers columns added later,
-- and in Postgres it also outranks a column-level revoke — which is exactly
-- why 0047's `revoke update (email)` was a no-op and 0048 had to be written.
--
-- WHICH SESSION WRITES THIS COLUMN: the user's OWN session, not the service
-- role. app/auth/callback/route.ts builds its client with createClient() from
-- lib/supabase/server (cookie-based, `authenticated` role), so the write runs
-- under RLS. It succeeds because of `profiles_update_own`
-- (0001_initial_schema.sql:259) — `using (auth.uid() = id) with check
-- (auth.uid() = id)` — scoping it to the caller's own row, which is the only
-- row the callback ever touches. No service-role client is required there.

----------------------------------------------------------------------
-- 3. Backfill role_chosen for the 6 existing investor rows ONLY
----------------------------------------------------------------------
-- These 6 people picked "Investor" on purpose. Leaving them at false would let
-- a stray ?role= on any later sign-in rewrite their account_type, because the
-- callback's guard is `role_chosen = false`.
--
-- 'founder' rows are deliberately LEFT AT FALSE: a founder row is
-- indistinguishable from the handle_new_user default, so false is the honest
-- value — it means "no explicit choice has been recorded yet", which is
-- correct for them and lets a first real choice land.
--
-- This UPDATE is the ONLY row write in this migration. Nothing else touches a
-- real member's data.
update public.profiles
   set role_chosen = true
 where account_type = 'investor'
   and role_chosen is false;

----------------------------------------------------------------------
-- 4. locale DEFAULT 'en' -> 'th' (NEW ROWS ONLY)
----------------------------------------------------------------------
-- Drift, not a decision. 0040's own header says "Defaults to 'en' to match
-- DEFAULT_LOCALE"; DEFAULT_LOCALE was later changed to 'th' (lib/i18n.ts) and
-- the column default was never moved. handle_new_user never set locale, and
-- lib/i18n-server.ts getLocale() resolves cookie -> profiles.locale ->
-- DEFAULT_LOCALE, so the row ALWAYS beats the Thai default. Live result on a
-- Thai-first platform: 105 of 117 profiles sit at 'en'.
alter table public.profiles
  alter column locale set default 'th';

-- DELIBERATELY NO BACKFILL. A row that says 'en' because somebody switched the
-- language (app/actions/locale.ts writes it on every switch) is
-- indistinguishable from a row that says 'en' because nobody was ever asked.
-- Rewriting both would silently flip the UI language out from under real
-- members, and the owner has not approved touching their rows. New rows only.

----------------------------------------------------------------------
-- 5. handle_new_user — honour all three roles, record the choice, speak Thai
----------------------------------------------------------------------
-- Started from the 0050 version verbatim (and diffed against the live
-- pg_get_functiondef, which matched it exactly). Changed ONLY:
--   * account_type: an allowlist membership test over the three values instead
--     of `= 'investor'`, so 'explorer' survives row creation. Anything
--     unrecognised, absent, or arriving from an OAuth signup still falls back
--     to 'founder' (and still defends the CHECK).
--   * role_chosen: true exactly when raw_user_meta_data carried one of the
--     three recognised values — i.e. the email/password path, where
--     signupAction put it there. OAuth signups have no metadata role, so they
--     are born false and /auth/callback gets to apply the ?role= once.
--   * locale: inserted explicitly as 'th' rather than leaning on the column
--     default from section 4, so the function states its own intent and a
--     future default change cannot silently alter signup behaviour.
-- The slug-collision loop, the LinkedIn `verified` logic and the
-- security definer / search_path settings are UNCHANGED.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  signed_up_via_linkedin boolean := (
    new.raw_app_meta_data ->> 'provider' = 'linkedin_oidc'
  );
  requested_role text := new.raw_user_meta_data ->> 'account_type';
  recognised_role boolean := requested_role in ('founder', 'investor', 'explorer');
  base_slug text;
  candidate_slug text;
  n int;
begin
  base_slug := slugify_text(coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1)
  ));
  if base_slug is null or length(base_slug) < 3 then
    base_slug := 'founder-' || replace(substr(new.id::text, 1, 8), '-', '');
  end if;
  base_slug := substr(base_slug, 1, 50);

  candidate_slug := base_slug;
  n := 2;
  while exists (select 1 from public.profiles where slug = candidate_slug) loop
    candidate_slug := substr(base_slug, 1, 47) || '-' || n;
    n := n + 1;
  end loop;

  insert into public.profiles (
    id, full_name, first_name, last_name, email, verified, slug,
    account_type, role_chosen, locale
  )
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    nullif(new.raw_user_meta_data ->> 'first_name', ''),
    nullif(new.raw_user_meta_data ->> 'last_name', ''),
    new.email,
    coalesce(signed_up_via_linkedin, false),
    candidate_slug,
    case when recognised_role then requested_role else 'founder' end,
    coalesce(recognised_role, false),
    'th'
  );
  return new;
end;
$function$;
