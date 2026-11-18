-- 0089: a product can carry up to 8 screenshots (was 5, 0083).
--
-- The founder's call, 2026-11-18: on a computer the deck card shows a
-- product's screenshots four at a time, as a 2 x 2 grid, and moves on to the
-- next four (components/ProductGallery.tsx, perView). Eight is two full grids;
-- at five the second grid was a single picture.
--
-- ONLY THE CAP MOVES HERE. The new MINIMUM of four lives in the server actions
-- (lib/post-actions.ts createProductAction / updateProductAction), not in the
-- database, on purpose: a CHECK is re-tested on EVERY update of a row, so it
-- would refuse any later write to the two live products that have two
-- screenshots each — a moderator hiding one included — and the founder chose
-- to let them keep theirs until their makers edit them.
--
-- Loosening: every existing row (at most 5) satisfies the new check, so it
-- validates at once. guard_post_member_write (0083) checks where each image
-- lives, never how many, so it needs no change.

alter table public.forum_posts
  drop constraint if exists forum_posts_image_urls_count;

alter table public.forum_posts
  add constraint forum_posts_image_urls_count
    check (cardinality(image_urls) <= 8);

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conname = 'forum_posts_image_urls_count';
--     -> CHECK ((cardinality(image_urls) <= 8))
