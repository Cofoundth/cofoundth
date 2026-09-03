-- Meetup hosting, phase 2: categories.
--
-- 0058 already shipped created_by + description + RSVPs, so opening hosting to
-- founders needs no structural change — only the category axis Onfound's
-- meetup cards lead with (Run / Coffee / Cowork / Dinner / Other; we add Talk).
-- The category drives the card's emoji band and chip; 'other' is the default
-- so every existing row stays valid.
--
-- Writes still run through service-role server actions only (no RLS write
-- policy on meetups) — the founder-facing create action enforces its own
-- gate the same way the admin actions do.

alter table public.meetups
  add column if not exists category text not null default 'other'
  constraint meetups_category_check
  check (category in ('run','coffee','cowork','dinner','talk','other'));
