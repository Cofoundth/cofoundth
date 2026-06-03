-- Profiles can link more than LinkedIn. Add Instagram, Facebook, and X.
-- linkedin_url already exists. Shown as an icon row on the profile.

alter table public.profiles
  add column if not exists instagram_url text,
  add column if not exists facebook_url text,
  add column if not exists x_url text;
