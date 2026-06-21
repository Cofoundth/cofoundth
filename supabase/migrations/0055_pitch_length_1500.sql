-- The app pitch cap was raised to LONG_TEXT_MAX (1500), but these DB CHECK
-- constraints were left at the old values (profiles 500, organizations 1000),
-- so a 501-1500 char pitch would pass the form yet fail the insert. Align them.
alter table public.profiles drop constraint if exists pitch_length;
alter table public.profiles
  add constraint pitch_length check (pitch is null or char_length(pitch) <= 1500);

alter table public.organizations drop constraint if exists org_pitch_length;
alter table public.organizations
  add constraint org_pitch_length check (pitch is null or char_length(pitch) <= 1500);
