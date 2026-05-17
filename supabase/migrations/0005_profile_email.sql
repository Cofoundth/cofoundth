-- CoFound.th — sync `auth.users.email` into `profiles.email` so the app
-- can read recipient emails without admin/service-role queries.
--
-- Use cases: auto-fill the attendee in the Schedule Call → Google Calendar
-- URL template; future direct-mail / @mention flows.

-- 1. Add column ---------------------------------------------------------

alter table profiles add column email text;
create index profiles_email_idx on profiles (email);

-- 2. Backfill from existing auth.users ----------------------------------

update profiles p
set email = u.email
from auth.users u
where p.id = u.id and p.email is null;

-- 3. Update the new-user trigger to include email + LinkedIn auto-verify
--    (combines logic from migration 0003).

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
  insert into public.profiles (id, full_name, email, verified)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(new.raw_user_meta_data ->> 'name', ''),
      split_part(new.email, '@', 1)
    ),
    new.email,
    coalesce(signed_up_via_linkedin, false)
  );
  return new;
end;
$$;

-- 4. Keep email in sync if a user changes their auth email ---------------

create or replace function sync_user_email()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_change on auth.users;
create trigger on_auth_user_email_change
after update of email on auth.users
for each row execute function sync_user_email();
