-- Account persona: founder/company vs investor.
--
-- `account_type` is chosen at REGISTRATION. The investor experience is a
-- placeholder for now (the real Phase-2 investor module is built later); this
-- migration just lays the data foundation + routing hook.
--
-- NOTE: "admin" is intentionally NOT an account_type. Admin is a *granted*
-- privilege (the is_admin flag), never self-selected at signup.

alter table public.profiles
  add column if not exists account_type text not null default 'founder';

alter table public.profiles
  drop constraint if exists account_type_check;
alter table public.profiles
  add constraint account_type_check check (account_type in ('founder', 'investor'));

-- Migration 0048 replaced the table-level SELECT grant with a per-column grant,
-- so a brand-new column is unreadable by `authenticated` until granted. Without
-- this, the (app) layout's `select account_type` would raise "permission denied
-- for column account_type" for every logged-in user.
grant select (account_type) on public.profiles to authenticated;

-- Carry account_type from signup metadata into the profile. OAuth signups have
-- no account_type in metadata → default 'founder'. Anything other than the
-- exact string 'investor' falls back to 'founder' (defends the CHECK).
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
    id, full_name, first_name, last_name, email, verified, slug, account_type
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
    case when new.raw_user_meta_data ->> 'account_type' = 'investor'
         then 'investor' else 'founder' end
  );
  return new;
end;
$function$;
