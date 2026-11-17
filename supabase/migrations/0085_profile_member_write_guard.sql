-- 0085: what a member may write into their own profiles row, whatever client
-- they write it with.
--
-- ── WHY ────────────────────────────────────────────────────────────────────
-- Same shape as 0083 for posts. `authenticated` holds a table-level INSERT and
-- UPDATE grant on public.profiles (the column revokes in 0042-0047 are no-ops
-- under it — 0078's header), and the RLS policies check only that the row is
-- the caller's own (id = auth.uid()). So a member's own JWT can PATCH any of
-- the row's columns straight through PostgREST, past every check in the
-- profile editors. Mapped 2026-11-17 (every writer, every renderer, every
-- decision that reads a column) and re-checked against the live database:
--
--   · email     — no app path writes it (handle_new_user and sync_user_email,
--                 both SECURITY DEFINER, own it). It is read by the sign-up
--                 "already registered" check, so a member who copies someone
--                 else's address into their row blocks that person's sign-up;
--                 it also addresses partnership-request mail and calendar
--                 invites.
--   · slug      — no app path writes it (handle_new_user). Changing it moves a
--                 member's public /founders/<slug> page; a UUID-shaped slug
--                 sends links to another member's profile, or loops.
--   · created_at — no app path writes it. It orders the public founder list,
--                 the landing, /browse, /companies, the community "joined"
--                 ticker and the "New" badge — a date in 2030 is the top slot
--                 forever (0083's "THE CLOCK", on profiles).
--   · photo_url — written only by the avatar upload, through the service role.
--                 Any URL a member puts here loads in every visitor's browser
--                 (the CSP allows any https: image), logged-out ones included.
--   · project_images — the member's own uploads (components/project-image-
--                 actions.ts: `<id>/project-<uuid>.<ext>` in post-images),
--                 re-sent by the editors; any URL works today.
--   · type      — the company/individual switch lives in the FOUNDER editors
--                 only, but an explorer can PATCH type='company' and appear in
--                 /companies and pass its partnership gates.
--   · sizes     — names, texts, links and every array are unbounded, and the
--                 old array caps (partnership_seeking, project_images,
--                 status_tags) measure the first dimension only, so a
--                 two-dimensional array passes them. /browse sends ~28 columns
--                 of every complete founder to the browser, so one bloated row
--                 is downloaded by every member who opens it. A NULL element
--                 ('{NULL}') also fools set_profile_complete's array_length
--                 test.
--
-- ── THE RULES ──────────────────────────────────────────────────────────────
-- For the browser roles only (anon, authenticated), like 0078/0083: the service
-- role, migrations and the SECURITY DEFINER sign-up functions (owned by
-- postgres, so current_user is postgres inside them) pass untouched.
--
--   INSERT       refused. Rows are created by handle_new_user at sign-up;
--                no app code inserts one (profiles_insert_own is unused).
--   UPDATE       email, slug and created_at cannot change. photo_url cannot
--                change except to NULL.
--                type may change only on a founder row (the account_type the
--                row has after the update — upgrading to founder and then
--                choosing a company is the app's own path).
--                Every other rule below applies only to a value that CHANGED,
--                so a legacy row, or a sign-up value longer than the editors
--                allow, never makes an unrelated save (the locale switch, say)
--                fail.
--   sizes        full_name ≤ 120, first_name and last_name ≤ 60, location and
--                company_name ≤ 150, why_this, background, work_experience
--                and education ≤ 1500 (pitch already has its CHECK, 1500).
--   links        instagram_url, facebook_url and x_url are http(s) and ≤ 300;
--                linkedin_url ≤ 300 and project_url ≤ 400 (both already have a
--                format CHECK).
--   arrays       one-dimensional, no NULL element, and at most:
--                  i_am 10, intent 5, looking_for 10, status_tags 5,
--                  industry 10 × 60, skills 30 × 60, capabilities 10 × 60,
--                  partnership_seeking 10 × 60, activities 20 × 100,
--                  help_with 15 × 100, needs_help_with 15 × 100,
--                  project_images 3 × 400.
--   project_images  every image the write ADDS is an upload in the member's
--                own folder of post-images; one already on the row may stay.
--
-- Each limit is at or above what the editors themselves allow (settings and
-- onboarding: names 40 + 40 = 81, location and company 100, long texts
-- LONG_TEXT_MAX = 1500, social links 200 + "https://", project link 300 +
-- "https://", skills 30, help topics 15 of up to 68 characters, three
-- project images) and above every live row (measured first: longest name 29,
-- longest long text 1363, most skills 13, most industries 10, no NULL
-- elements, no multi-dimensional arrays, every photo and project image in the
-- member's own folder), so nobody using the app meets one.
--
-- ── WHAT IS NOT HERE ──────────────────────────────────────────────────────
-- account_type, role_chosen and onboarded are left as they are: the investor
-- role is suspended for now (the owner's call, 2026-11-17), and the founder /
-- explorer moves are the app's own. Sign-up metadata (handle_new_user) is not
-- covered by a browser-role trigger; it is a separate change.

create or replace function private.array_fits(
  arr anyarray,
  max_items integer,
  max_len integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select arr is null or (
    coalesce(array_ndims(arr), 1) = 1
    and cardinality(arr) <= max_items
    and array_position(arr, null) is null
    and coalesce(
          (select max(char_length(x::text)) from unnest(arr) as x),
          0
        ) <= max_len
  );
$$;

revoke all on function private.array_fits(anyarray, integer, integer) from public;
grant execute on function private.array_fits(anyarray, integer, integer)
  to anon, authenticated;
comment on function private.array_fits(anyarray, integer, integer) is
  'True when an array is NULL, or one-dimensional with no NULL element, at most max_items elements and no element longer than max_len characters. Used by guard_profile_member_write (0085).';

create or replace function public.guard_profile_member_write()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  own_folder text;
  added text;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    raise exception 'a profile is created at sign-up'
      using errcode = '42501';
  end if;

  -- Columns no browser path writes.
  if new.email is distinct from old.email then
    raise exception 'profiles.email follows the sign-in email'
      using errcode = '42501';
  end if;
  if new.slug is distinct from old.slug then
    raise exception 'profiles.slug cannot change'
      using errcode = '42501';
  end if;
  if new.created_at is distinct from old.created_at then
    raise exception 'profiles.created_at cannot change'
      using errcode = '42501';
  end if;
  if new.photo_url is distinct from old.photo_url
     and new.photo_url is not null then
    raise exception 'a profile photo is set by uploading one'
      using errcode = '42501';
  end if;
  if new.type is distinct from old.type
     and new.account_type is distinct from 'founder' then
    raise exception 'only a founder profile has a type'
      using errcode = '42501';
  end if;

  -- Sizes, only where the value changed.
  if (new.full_name is distinct from old.full_name and char_length(new.full_name) > 120)
     or (new.first_name is distinct from old.first_name and char_length(new.first_name) > 60)
     or (new.last_name is distinct from old.last_name and char_length(new.last_name) > 60)
     or (new.location is distinct from old.location and char_length(new.location) > 150)
     or (new.company_name is distinct from old.company_name and char_length(new.company_name) > 150)
     or (new.why_this is distinct from old.why_this and char_length(new.why_this) > 1500)
     or (new.background is distinct from old.background and char_length(new.background) > 1500)
     or (new.work_experience is distinct from old.work_experience and char_length(new.work_experience) > 1500)
     or (new.education is distinct from old.education and char_length(new.education) > 1500)
  then
    raise exception 'a profile field is too long'
      using errcode = '23514';
  end if;

  if (new.instagram_url is distinct from old.instagram_url
        and new.instagram_url is not null
        and (char_length(new.instagram_url) > 300 or new.instagram_url !~* '^https?://'))
     or (new.facebook_url is distinct from old.facebook_url
        and new.facebook_url is not null
        and (char_length(new.facebook_url) > 300 or new.facebook_url !~* '^https?://'))
     or (new.x_url is distinct from old.x_url
        and new.x_url is not null
        and (char_length(new.x_url) > 300 or new.x_url !~* '^https?://'))
     or (new.linkedin_url is distinct from old.linkedin_url
        and char_length(new.linkedin_url) > 300)
     or (new.project_url is distinct from old.project_url
        and char_length(new.project_url) > 400)
  then
    raise exception 'a profile link must be an http(s) address of reasonable length'
      using errcode = '23514';
  end if;

  if (new.i_am is distinct from old.i_am and not private.array_fits(new.i_am, 10, 50))
     or (new.intent is distinct from old.intent and not private.array_fits(new.intent, 5, 50))
     or (new.looking_for is distinct from old.looking_for and not private.array_fits(new.looking_for, 10, 50))
     or (new.status_tags is distinct from old.status_tags and not private.array_fits(new.status_tags, 5, 50))
     or (new.industry is distinct from old.industry and not private.array_fits(new.industry, 10, 60))
     or (new.skills is distinct from old.skills and not private.array_fits(new.skills, 30, 60))
     or (new.capabilities is distinct from old.capabilities and not private.array_fits(new.capabilities, 10, 60))
     or (new.partnership_seeking is distinct from old.partnership_seeking and not private.array_fits(new.partnership_seeking, 10, 60))
     or (new.activities is distinct from old.activities and not private.array_fits(new.activities, 20, 100))
     or (new.help_with is distinct from old.help_with and not private.array_fits(new.help_with, 15, 100))
     or (new.needs_help_with is distinct from old.needs_help_with and not private.array_fits(new.needs_help_with, 15, 100))
     or (new.project_images is distinct from old.project_images and not private.array_fits(new.project_images, 3, 400))
  then
    raise exception 'a profile list is too long or malformed'
      using errcode = '23514';
  end if;

  if new.project_images is distinct from old.project_images then
    own_folder :=
      'https://fhimrhyhmdwrktfctvcc.supabase.co/storage/v1/object/public/post-images/'
      || new.id::text || '/';
    foreach added in array coalesce(new.project_images, '{}')
    loop
      continue when added = any (coalesce(old.project_images, '{}'));
      if left(added, length(own_folder)) <> own_folder
         or substr(added, length(own_folder) + 1)
            !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$' then
        raise exception 'a project image must be an upload in your own folder of post-images'
          using errcode = '42501';
      end if;
    end loop;
  end if;

  return new;
end;
$$;

comment on function public.guard_profile_member_write() is
  'Browser roles only (anon, authenticated). INSERT refused (sign-up creates profiles). UPDATE: email, slug and created_at fixed; photo_url only to NULL; type only on a founder row; changed names, texts, links and arrays within size limits; added project images must be the member''s own uploads. See 0085.';

drop trigger if exists profiles_guard_member_write on public.profiles;
create trigger profiles_guard_member_write
  before insert or update on public.profiles
  for each row execute function public.guard_profile_member_write();

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- As a member (set local role authenticated + request.jwt.claims), rolled back:
--   update email / slug / created_at                  -> ERROR 42501
--   update photo_url to another URL                    -> ERROR 42501 (to NULL: ok)
--   an explorer setting type = 'company'               -> ERROR 42501
--   a 121-character full_name, a 31-item skills list,
--   a 2-D industry array, '{NULL}' in i_am             -> ERROR 23514
--   x_url 'javascript:…'                               -> ERROR 23514
--   project_images adding another host's image         -> ERROR 42501
--   the editor's own save (unchanged email/slug/photo) -> UPDATE 1
--   insert a profiles row                              -> ERROR 42501
