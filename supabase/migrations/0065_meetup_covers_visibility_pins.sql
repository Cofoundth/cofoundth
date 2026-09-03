-- Meetup hosting, phase 3: parity with the reference product's event cards.
--
--   image_url   host-uploaded cover (Supabase storage, bucket meetup-covers).
--               Null falls back to the category's bundled SVG cover, so every
--               card has an image without requiring an upload.
--   visibility  'private' = link-only: hidden from the list page, the map and
--               the dashboard digest, reachable by anyone who has the URL.
--               (The reference product marks cards "Private"; interpreted here
--               as unlisted-by-link, the least surprising reading.)
--   lat/lng     optional pin for the map view. Free-text `location` stays the
--               human-readable truth; the pin only powers the map.

alter table public.meetups
  add column if not exists image_url text,
  add column if not exists visibility text not null default 'public'
    constraint meetups_visibility_check check (visibility in ('public','private')),
  add column if not exists lat double precision,
  add column if not exists lng double precision;
