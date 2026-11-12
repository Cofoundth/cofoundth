-- ============================================================================
-- Where a product runs: the maker's answer to "Runs on" on /products/new.
--
-- WHY (the owner, 2026-11-12): a desktop visitor pressing "Try" on a phone app
-- landed on an App Store page with nothing to try. The deck now shows such a
-- visitor a QR code to scan instead (app/(marketing)/products/PhoneHandoff.tsx).
-- An app-store LINK already says "phone only" without this column; what it
-- cannot say is a phone app whose link is its own website. The maker knows,
-- so the form asks.
--
-- WHY A COLUMN, not `tags`: lib/post-types.ts records the rule — `tags` holds
-- the one category, and that is "not a reason to pack more things into tags".
-- The test 0076 applied is "is there an existing place for this?", and there
-- is not.
--
-- A CLOSED SET, checked here so a direct PostgREST insert cannot write a slug
-- the app does not know: web, ios, android, windows, mac (PRODUCT_PLATFORMS in
-- lib/post-types.ts — change the two together). NOT NULL DEFAULT '{}' for the
-- reason 0076 gives for image_urls: an empty array is the honest "not said"
-- (every product added before this), and no consumer spells a null.
--
-- Additive and non-destructive: no rewrite (PG11+ keeps an added constant
-- default in the catalog), no backfill, no policy change, nothing dropped. No
-- grant: forum_posts holds table-wide grants (0076 says so, and why).
-- Idempotent: `if not exists`, and the check is dropped before it is added.
-- ============================================================================

alter table public.forum_posts
  add column if not exists platforms text[] not null default '{}';

alter table public.forum_posts
  drop constraint if exists forum_posts_platforms_known;
alter table public.forum_posts
  add constraint forum_posts_platforms_known
  check (platforms <@ array['web', 'ios', 'android', 'windows', 'mac']::text[]);

comment on column public.forum_posts.platforms is
  'Where a product (kind show_and_tell) runs, from the Add product form: any of web, ios, android, windows, mac. Empty = not said (every product added before 0080).';
