-- Seed first_name / last_name into profiles at signup so onboarding pre-fills
-- them. Email+password signup now sends first_name/last_name in user metadata
-- (see app/(auth)/actions.ts). OAuth (Google/LinkedIn) only provides full_name,
-- so those stay null and onboarding asks — unchanged.

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

  insert into public.profiles (id, full_name, first_name, last_name, email, verified, slug)
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
    candidate_slug
  );
  return new;
end;
$function$;
