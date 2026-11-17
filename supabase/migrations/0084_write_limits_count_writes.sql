-- 0084: write limits that deleting does not reset, and arrays with a size.
--
-- Found by the review of 0083 (2026-11-17), each one checked against the code
-- before this was written.
--
-- ── 1. A LIMIT HAS TO COUNT WRITES, NOT ROWS ──────────────────────────────
-- 0083 counted the author's rows that still EXIST inside each window. An
-- author may delete their own rows (forum_posts_delete_own, and the
-- comment delete policy behind deletePostCommentAction) — through the app's
-- own Delete buttons, no API call needed. So delete-and-add-again was never
-- limited:
--   · a product deleted and added again is the newest row again, so it holds
--     card 1 of the deck (and of /) for as long as someone keeps doing it —
--     the effect 0083's "THE CLOCK" rule took away from forged dates;
--   · a comment added and deleted, over and over, writes a "commented on
--     your product" notification every time (notify_on_comment), and the
--     delete never takes it back.
-- The live-row cap still held, so the FLOOD protection was intact; the RATE
-- was not. Now each limited write takes a slot in an append-only log, and the
-- limits count the log. Deleting the row gives nothing back.
--
-- WHERE THE LOG LIVES. In a new schema, `private`, which PostgREST does not
-- expose (checked: it serves public and graphql_public only; pg_graphql is
-- not installed). Members get no privilege on the table at all, so they can
-- neither read their log nor delete from it. The one way in is
-- private.take_write_slot(), SECURITY DEFINER, which the 0083 triggers call
-- (they run as the member, hence EXECUTE for anon and authenticated).
--
-- WHOSE SLOT. The function takes the slot for auth.uid() — the caller — and
-- never for a row's author_id. A member who forges author_id = someone else
-- spends their OWN slot (and RLS then refuses the row, rolling the slot back
-- with it), so nobody can use up another member's quota. Called directly, it
-- can only spend the caller's own.
--
-- The numbers are unchanged: 5 products per 24 hours, 10 posts or milestones
-- per hour, 10 comments per 10 minutes (lib/write-limits.ts says them to the
-- member; change both together). The advisory lock moves into the function,
-- one key per member and kind, so concurrent requests still count exactly.
-- Each call also drops that member's log rows older than two days — the
-- longest window is one — so the table stays the size of the last two days.
--
-- ── 2. ARRAYS HAVE A SIZE ─────────────────────────────────────────────────
-- 0083's "SIZE" rule capped link_url and image_urls but not the other two
-- arrays a member writes:
--   · platforms is checked only for containment (0080: platforms <@ the five
--     known values), and repeated values pass it — `web` 200,000 times is a
--     1.2 MB row, and the feed sends platforms to every viewer.
--   · tags is capped at 5 by array_length(tags, 1), the FIRST dimension
--     only, so a 5 × N two-dimensional array passes.
-- Postgres does not enforce declared array dimensions, so: every forum_posts
-- array is one-dimensional, and platforms holds at most 5. Live rows were
-- checked first: none is multi-dimensional, the most platforms on a row is 1.
--
-- ── WHAT IS NOT HERE ──────────────────────────────────────────────────────
-- profiles has the same two kinds of hole (photo_url takes any URL; skills,
-- capabilities and the other arrays have no size). That is a separate table
-- with its own writers (onboarding, OAuth avatars), so it gets its own change.

-- ── the log ───────────────────────────────────────────────────────────────

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
comment on schema private is
  'Not exposed through PostgREST. Holds what members must not read or write directly; reached only through SECURITY DEFINER functions.';

create table if not exists private.member_writes (
  author_id uuid not null references public.profiles (id) on delete cascade,
  what text not null check (what in ('product', 'post', 'comment')),
  created_at timestamptz not null default now()
);
create index if not exists member_writes_recent_idx
  on private.member_writes (author_id, what, created_at desc);
revoke all on private.member_writes from public, anon, authenticated;
comment on table private.member_writes is
  'One row per limited write by a member (0083/0084). Append-only for members: written by private.take_write_slot() only, never deleted by them, so deleting a post or comment does not hand its slot back.';

-- What the last day already holds, so the switch from counting rows to
-- counting writes does not hand every member a fresh quota.
insert into private.member_writes (author_id, what, created_at)
select author_id,
       case when kind = 'show_and_tell' then 'product' else 'post' end,
       created_at
  from public.forum_posts
 where created_at > now() - interval '24 hours'
   and not exists (select 1 from private.member_writes);
insert into private.member_writes (author_id, what, created_at)
select author_id, 'comment', created_at
  from public.forum_comments
 where created_at > now() - interval '10 minutes'
   and not exists (select 1 from private.member_writes where what = 'comment');

create or replace function private.take_write_slot(
  p_what text,
  p_limit integer,
  p_window interval
)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  me uuid := auth.uid();
  used integer;
begin
  -- No signed-in member, nothing to count: an anonymous write is refused by
  -- RLS anyway.
  if me is null then
    return true;
  end if;

  perform pg_advisory_xact_lock(84, hashtext(me::text || '/' || p_what));

  delete from private.member_writes
   where author_id = me
     and created_at < now() - interval '2 days';

  select count(*) into used
    from private.member_writes
   where author_id = me
     and what = p_what
     and created_at > now() - p_window;
  if used >= p_limit then
    return false;
  end if;

  insert into private.member_writes (author_id, what) values (me, p_what);
  return true;
end;
$$;

revoke all on function private.take_write_slot(text, integer, interval) from public;
grant execute on function private.take_write_slot(text, integer, interval)
  to anon, authenticated;
comment on function private.take_write_slot(text, integer, interval) is
  'Takes one slot of a per-member write limit for auth.uid() — never for a row''s author — and records it in private.member_writes. False when the window is full. Called by the 0083 guards.';

-- ── the guards, now counting writes ───────────────────────────────────────
-- Everything else in them is 0083's, unchanged.

create or replace function public.guard_post_member_write()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  own_folder text;
  added text;
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();

    if new.kind = 'show_and_tell' then
      if not private.take_write_slot('product', 5, interval '24 hours') then
        raise exception 'rate_limited'
          using errcode = 'P0001', detail = 'products: 5 per member per 24 hours';
      end if;
    elsif not private.take_write_slot('post', 10, interval '1 hour') then
      raise exception 'rate_limited'
        using errcode = 'P0001', detail = 'posts: 10 per member per hour';
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
  'Browser roles only (anon, authenticated). INSERT: created_at/updated_at are now(); at most 5 products per member per 24h and 10 posts/milestones per member per hour, counted as WRITES in private.member_writes (rate_limited, P0001). UPDATE: created_at is fixed. Both: an added image must be an upload in the author''s own post-images folder; tags are at most 30 characters. See 0083, 0084.';

create or replace function public.guard_comment_member_write()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user not in ('anon', 'authenticated') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_at := now();
    new.updated_at := now();

    if not private.take_write_slot('comment', 10, interval '10 minutes') then
      raise exception 'rate_limited'
        using errcode = 'P0001', detail = 'comments: 10 per member per 10 minutes';
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
  'Browser roles only (anon, authenticated). INSERT: created_at/updated_at are now(); at most 10 comments per member per 10 minutes, counted as WRITES in private.member_writes (rate_limited, P0001). UPDATE: created_at and post_id are fixed. See 0083, 0084.';

-- ── arrays ────────────────────────────────────────────────────────────────

alter table public.forum_posts
  drop constraint if exists forum_posts_arrays_shape;
alter table public.forum_posts
  add constraint forum_posts_arrays_shape check (
    coalesce(array_ndims(tags), 1) = 1
    and coalesce(array_ndims(platforms), 1) = 1
    and coalesce(array_ndims(image_urls), 1) = 1
    and cardinality(platforms) <= 5
  );

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- As a member, inside a transaction that is rolled back:
--   add 5 products, delete all 5, add a 6th          -> ERROR P0001 rate_limited
--   add 10 comments, delete all 10, add an 11th      -> ERROR P0001 rate_limited
--   a product with author_id = another member        -> RLS refuses it, and that
--     member's log is untouched
--   platforms with 6 values, or a 2-D tags array      -> ERROR 23514
--   select from private.member_writes                -> ERROR 42501
