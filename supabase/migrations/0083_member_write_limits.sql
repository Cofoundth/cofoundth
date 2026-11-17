-- 0083: what a member may write into forum_posts and forum_comments, whatever
-- client they write it with.
--
-- ── WHY ────────────────────────────────────────────────────────────────────
-- Both tables' RLS policies check ONE thing: that the row is the caller's own
-- (author_id = auth.uid()). Every other rule — lengths, the link test, where
-- an image comes from, how often — lives in the server actions
-- (lib/post-actions.ts), and a member does not have to go through them: the
-- JWT the app signs them in with can POST straight to PostgREST. Found in the
-- 2026-11-16 gap sweep and re-checked against the live schema:
--
--   1. FLOOD. Nothing limited how many rows one account inserts, and the
--      shelf read the newest rows FIRST and applied its author gate AFTER the
--      LIMIT (lib/posts.ts getPublicProductsPage). About eighty product rows
--      from any account the gate refuses — an explorer, an investor, a
--      suspended member — emptied the deck, and with it the front door. The
--      same change moves that gate INTO the query; the limits below cap what
--      an account the gate ACCEPTS can push onto the deck or the feed before a
--      moderator suspends it (which, with the gate in the query, now clears
--      the deck at once instead of blanking it).
--   2. THE CLOCK. created_at was member-writable on insert and on update. The
--      deck and the feed are newest-first, so a product dated 2030 held card 1
--      for four years.
--   3. IMAGES. image_url / image_urls took any string, and the CSP allows any
--      https: image (proxy.ts, img-src), so a row could load a third-party
--      tracker into every visitor's browser, or show a picture no upload check
--      ever saw — and hand it to link previews as the product's og:image.
--   4. SIZE. link_url had no length cap, so a handful of rows carrying a
--      megabyte "link" each made the public deck a megabyte per card.
--
-- ── THE RULES ──────────────────────────────────────────────────────────────
-- For the browser roles only (anon, authenticated), like 0078/0081: the
-- service role and migrations are trusted and pass untouched.
--
--   forum_posts, on INSERT
--     · created_at and updated_at are the server's clock, whatever was sent.
--     · at most 5 products (kind 'show_and_tell') per author in any 24 hours,
--       and at most 10 posts or milestones per author in any hour.
--   forum_posts, on UPDATE
--     · created_at cannot change.
--   forum_posts, both
--     · every image the write ADDS is an upload in the author's own folder of
--       the post-images bucket — exactly what uploadPostImage writes
--       (`<author id>/post-<time>-<random>.<ext>`). An image already on the
--       row may stay, so editing a row never trips over its own pictures.
--     · each tag is at most 30 characters (parseTags' own limit).
--   forum_comments, on INSERT
--     · created_at and updated_at are the server's clock.
--     · at most 10 comments per author in any 10 minutes.
--   forum_comments, on UPDATE
--     · created_at and post_id cannot change: a comment stays where, and
--       when, it was written.
--
-- And for EVERY writer, as CHECK constraints (no legitimate path writes
-- anything else — verified on the live rows before this was written: 0 links
-- that are not http(s), the longest link 68 characters, no row over 5
-- images):
--     · link_url is http(s) and at most 2048 characters.
--     · image_urls holds at most 5 (MAX_PRODUCT_IMAGES, lib/post-types.ts).
--
-- ── THE LIMITS, AND WHY THESE NUMBERS ─────────────────────────────────────
-- Measured on the live tables before choosing: the busiest any account has
-- ever been is 4 products in a day, 4 posts in an hour and 2 comments in 10
-- minutes. Each limit is at least twice that, so nobody using the app as
-- intended meets one, and a member commenting their way through the deck in
-- one sitting still has a comment a minute.
-- The numbers are repeated in the app's refusal messages (lib/post-actions.ts
-- RATE_LIMITED) — change both together.
--
-- A limit is a COUNT of the author's recent rows, so two requests racing each
-- other could both read "4" and both insert. pg_advisory_xact_lock serialises
-- each author's inserts (one key per author, held to commit), which makes the
-- count exact; a single statement inserting many rows is covered too, because
-- a row-level BEFORE trigger sees the rows the same statement inserted ahead
-- of it. The refusal is `rate_limited` (P0001), which the server actions turn
-- into a sentence.
--
-- ── WHERE THE STORAGE ADDRESS COMES FROM ───────────────────────────────────
-- The project URL is written out below. It is NEXT_PUBLIC_SUPABASE_URL, and
-- the database cannot read the app's environment. If the project ever moves,
-- this fails CLOSED — members cannot add images until it is updated — which
-- is the direction that shows up at once.

alter table public.forum_posts
  drop constraint if exists forum_posts_link_url_web,
  drop constraint if exists forum_posts_image_urls_count;

alter table public.forum_posts
  add constraint forum_posts_link_url_web
    check (link_url is null
           or (char_length(link_url) <= 2048 and link_url ~* '^https?://')),
  add constraint forum_posts_image_urls_count
    check (cardinality(image_urls) <= 5);

create or replace function public.guard_post_member_write()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  own_folder text;
  added text;
  recent integer;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();

    perform pg_advisory_xact_lock(83, hashtext(new.author_id::text));
    if new.kind = 'show_and_tell' then
      select count(*) into recent
        from public.forum_posts
       where author_id = new.author_id
         and kind = 'show_and_tell'
         and created_at > now() - interval '24 hours';
      if recent >= 5 then
        raise exception 'rate_limited'
          using errcode = 'P0001', detail = 'products: 5 per author per 24 hours';
      end if;
    else
      select count(*) into recent
        from public.forum_posts
       where author_id = new.author_id
         and kind <> 'show_and_tell'
         and created_at > now() - interval '1 hour';
      if recent >= 10 then
        raise exception 'rate_limited'
          using errcode = 'P0001', detail = 'posts: 10 per author per hour';
      end if;
    end if;
  elsif new.created_at is distinct from old.created_at then
    raise exception 'forum_posts.created_at cannot change'
      using errcode = '42501';
  end if;

  own_folder :=
    'https://fhimrhyhmdwrktfctvcc.supabase.co/storage/v1/object/public/post-images/'
    || new.author_id::text || '/';
  foreach added in array array_append(coalesce(new.image_urls, '{}'), new.image_url)
  loop
    continue when added is null;
    continue when tg_op = 'UPDATE'
      and (added = old.image_url or added = any (old.image_urls));
    if left(added, length(own_folder)) <> own_folder
       or substr(added, length(own_folder) + 1)
          !~ '^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$' then
      raise exception 'an image must be an upload in the author''s own folder of post-images'
        using errcode = '42501';
    end if;
  end loop;

  if exists (select 1 from unnest(new.tags) t where char_length(t) > 30) then
    raise exception 'a tag is at most 30 characters'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

comment on function public.guard_post_member_write() is
  'Browser roles only (anon, authenticated). INSERT: created_at/updated_at are now(); at most 5 products per author per 24h and 10 posts/milestones per author per hour (rate_limited, P0001). UPDATE: created_at is fixed. Both: an added image must be an upload in the author''s own post-images folder; tags are at most 30 characters. See 0083.';

drop trigger if exists forum_posts_guard_member_write on public.forum_posts;
create trigger forum_posts_guard_member_write
  before insert or update on public.forum_posts
  for each row execute function public.guard_post_member_write();

create or replace function public.guard_comment_member_write()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  recent integer;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();

    perform pg_advisory_xact_lock(84, hashtext(new.author_id::text));
    select count(*) into recent
      from public.forum_comments
     where author_id = new.author_id
       and created_at > now() - interval '10 minutes';
    if recent >= 10 then
      raise exception 'rate_limited'
        using errcode = 'P0001', detail = 'comments: 10 per author per 10 minutes';
    end if;
  else
    if new.created_at is distinct from old.created_at then
      raise exception 'forum_comments.created_at cannot change'
        using errcode = '42501';
    end if;
    if new.post_id is distinct from old.post_id then
      raise exception 'a comment stays on the post it was written on'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.guard_comment_member_write() is
  'Browser roles only (anon, authenticated). INSERT: created_at/updated_at are now(); at most 10 comments per author per 10 minutes (rate_limited, P0001). UPDATE: created_at and post_id are fixed. See 0083.';

drop trigger if exists forum_comments_guard_member_write on public.forum_comments;
create trigger forum_comments_guard_member_write
  before insert or update on public.forum_comments
  for each row execute function public.guard_comment_member_write();

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- As a member (set local role authenticated + request.jwt.claims), inside a
-- transaction that is rolled back:
--   insert a product with created_at '2030-01-01'      -> created_at = now()
--   insert one whose image_url is another host          -> ERROR 42501
--   insert one whose image is in ANOTHER member's folder -> ERROR 42501
--   update an existing row's created_at                 -> ERROR 42501
--   a 6th product inside 24h / 11th post inside an hour / 11th comment inside
--   10 minutes                                          -> ERROR P0001 rate_limited
--   link_url 'javascript:…', or 2049+ characters        -> ERROR 23514
-- As the table owner, the same forged created_at is kept (trusted path).
