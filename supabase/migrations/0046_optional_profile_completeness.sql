-- Lower the signup wall: all profile fields become optional. Quality is gated
-- at the directory instead, via a maintained profile_complete flag.

-- 1. About me (pitch) becomes optional, no minimum, max 500.
alter table public.profiles drop constraint if exists pitch_length;
alter table public.profiles add constraint pitch_length
  check (pitch is null or char_length(pitch) <= 500);

-- 2. Maintained completeness flag — drives directory visibility.
alter table public.profiles
  add column if not exists profile_complete boolean not null default false;

create or replace function public.set_profile_complete()
returns trigger
language plpgsql
as $$
begin
  new.profile_complete :=
    trim(coalesce(new.full_name, '')) <> ''
    and coalesce(array_length(new.i_am, 1), 0) > 0
    and coalesce(array_length(new.looking_for, 1), 0) > 0
    and trim(coalesce(new.pitch, '')) <> '';
  return new;
end;
$$;

drop trigger if exists trg_profile_complete on public.profiles;
create trigger trg_profile_complete
  before insert or update on public.profiles
  for each row execute function public.set_profile_complete();

-- 3. Backfill existing rows.
update public.profiles set profile_complete =
  (trim(coalesce(full_name, '')) <> ''
   and coalesce(array_length(i_am, 1), 0) > 0
   and coalesce(array_length(looking_for, 1), 0) > 0
   and trim(coalesce(pitch, '')) <> '');

-- 4. Index for the directory filter.
create index if not exists idx_profiles_complete
  on public.profiles (profile_complete) where profile_complete;
