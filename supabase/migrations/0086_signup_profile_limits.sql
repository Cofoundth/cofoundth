-- 0086: what SIGN-UP may put into a profiles row.
--
-- 0085 guards every write a member makes to their profile from a browser. One
-- writer is outside it by construction: handle_new_user, the AFTER INSERT
-- trigger on auth.users that creates the row. It is SECURITY DEFINER (owned by
-- postgres), so current_user inside it is postgres and 0085's browser-role
-- guard never runs for it. And what it copies comes from raw_user_meta_data —
-- which the CLIENT sends to GoTrue's signUp. The app's own sign-up form sends
-- names of at most 50 + 50 characters (lib/signup-validation.ts), but anyone
-- can call GoTrue directly with the public key and send anything. Two holes:
--
--   · NAMES OF ANY LENGTH. full_name, first_name and last_name were stored as
--     sent. A name is shown wherever its member appears (comments, the
--     directory, notifications, emails), and 0085 caps it only when the
--     member edits it — a sign-up value nobody edits stays as long as it
--     arrived.
--   · A UUID-SHAPED SLUG. The slug is slugify_text(name), which keeps a
--     lowercase UUID exactly as it is. /profile/[id] reads a UUID-shaped
--     parameter as an ID (lib/slug.ts isUuid), so a member who signed up with
--     another member's id as their name got a slug that sends their own
--     profile links to that member — or loops, when it is their own.
--
-- So: names are cut to 0085's limits (full_name 120, first_name and last_name
-- 60), which every sign-up the app itself sends is already under; and a
-- UUID-shaped slug falls back to the same `founder-<8 hex>` the function
-- already uses for a name that slugifies to nothing (a Thai name, say). A
-- CHECK then refuses a UUID-shaped slug from ANY writer, so a script or a
-- future function cannot reintroduce it. Measured first: no live slug is
-- UUID-shaped, the longest stored name is 29 characters, and no auth.users
-- row carries a metadata name over 120.
--
-- Everything else in the function is unchanged, line for line: the slug
-- source and its uniqueness loop, the LinkedIn `verified` rule, the role
-- carry (account_type / role_chosen — the investor role is suspended, the
-- owner's call, and left alone here) and the 'th' locale.

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
  source_name text := coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    split_part(new.email, '@', 1)
  );
  base_slug text;
  candidate_slug text;
  n int;
begin
  base_slug := slugify_text(source_name);
  if base_slug is null
     or length(base_slug) < 3
     or base_slug ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
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
    left(source_name, 120),
    left(nullif(new.raw_user_meta_data ->> 'first_name', ''), 60),
    left(nullif(new.raw_user_meta_data ->> 'last_name', ''), 60),
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

alter table public.profiles
  drop constraint if exists profiles_slug_not_uuid;
alter table public.profiles
  add constraint profiles_slug_not_uuid
    check (slug !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- Insert auth.users rows as the owner inside a rolled-back transaction:
--   a normal English name, a Thai name, OAuth `name` metadata, no metadata
--   (email local part)                          -> same profile as before
--   a 500-character full_name                    -> full_name 120 characters
--   an existing member's id as the name          -> slug founder-<8 hex>
--   a LinkedIn provider                           -> verified = true
--   account_type 'explorer'                       -> explorer, role_chosen
