-- Align the DB pitch constraint with the lowered form minimum (200 -> 120).
--
-- Commit 39ae2a7 lowered the onboarding form's pitch floor from 200 to 120
-- chars to cut abandonment, but the DB CHECK still required >= 200. A pitch
-- of 120-199 chars passed client validation, then the profile UPDATE failed
-- with a check_violation — trapping the user mid-onboarding with a raw
-- Postgres error. This realigns the database to the form.

alter table public.profiles drop constraint pitch_length;
alter table public.profiles
  add constraint pitch_length
  check (
    pitch is null
    or (char_length(pitch) >= 120 and char_length(pitch) <= 500)
  );
