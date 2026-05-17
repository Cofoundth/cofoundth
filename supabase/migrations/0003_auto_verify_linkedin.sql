-- CoFound.th — auto-mark profiles as verified when user signed up via LinkedIn.
-- LinkedIn pre-verifies identity, so this matches CLAUDE.md's profile verification design.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  signed_up_via_linkedin boolean := (
    new.raw_app_meta_data ->> 'provider' = 'linkedin_oidc'
  );
begin
  insert into public.profiles (id, full_name, verified)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    coalesce(signed_up_via_linkedin, false)
  );
  return new;
end;
$$;
