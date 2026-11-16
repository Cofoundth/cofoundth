-- 0081: a product stays a product.
--
-- Products are stored as forum_posts rows (kind = 'show_and_tell', with a
-- link_url), in the same table as community posts and milestones. The app
-- keeps them apart everywhere a member looks — the feed, its search and the
-- landing exclude the kind (lib/posts.ts), and a product has its own page at
-- /products/<id>. Two things at the database still let one act as the other.
--
-- ── 1. THE COMMENT NOTIFICATION ───────────────────────────────────────────
-- notify_on_comment() (0028) is kind-blind: a comment on someone's PRODUCT
-- wrote exactly the row a comment on their post does, so lib/notifications.ts
-- could only say "commented on your post" and link to the community thread.
-- It now records the thread's kind as data.post_kind, which
-- lib/notifications.ts reads to say "your product" and open /products/<id>.
-- notifyMentions (lib/post-actions.ts) writes the same key for @mentions.
-- Notifications written before this migration that point at a product are
-- backfilled below; every other row reads as a post, which is what it is.
--
-- ── 2. SWITCHING KINDS ────────────────────────────────────────────────────
-- forum_posts_update_own (0002) is `auth.uid() = author_id` with no column
-- guard, and `authenticated` holds table-level UPDATE (see 0078's header). So
-- a member could PATCH their own row straight at PostgREST and turn a post
-- into a product — onto the public shelf, the sitemap and a crawlable page,
-- past every check createProductAction makes — or a product into a post,
-- which drops it into the community feed that never announces products.
-- guard_post_kind() refuses, from the two browser roles:
--   · any change of `kind`. Nothing in the app changes a row's kind; members
--     cannot even edit a post.
--   · a show_and_tell row losing its link, or (the one link-less legacy row)
--     gaining one: kind + a link together are what make a row a product
--     (lib/posts.ts productsQuery), so either flip is a kind switch too.
-- updateProductAction (lib/post-actions.ts) edits a product through the
-- member's own client and changes neither; its link is validated as http(s).
--
-- Same scope and shape as 0078's guards, for the same reasons: a BEFORE
-- UPDATE trigger rather than column grants, `security invoker` so it sees the
-- real caller, a denylist of 'anon' / 'authenticated' so the service role,
-- the dashboard and migrations are never blocked, and it refuses only a
-- CHANGE, never a payload that repeats the current value.

-- ── 1 ──────────────────────────────────────────────────────────────────────
create or replace function public.notify_on_comment()
  returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; post_title text; post_kind text; actor_name text;
begin
  select author_id, title, kind into post_author, post_title, post_kind
    from public.forum_posts where id = new.post_id;
  if post_author is null or post_author = new.author_id then return new; end if;
  select full_name into actor_name from public.profiles where id = new.author_id;
  insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
  values (post_author, new.author_id, 'comment', new.post_id,
          jsonb_build_object('actor_name', coalesce(actor_name, 'Someone'),
                             'post_title', coalesce(post_title, ''),
                             'post_kind', coalesce(post_kind, 'post')));
  return new;
exception when others then return new;
end; $$;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;

update public.notifications n
   set data = n.data || jsonb_build_object('post_kind', f.kind)
  from public.forum_posts f
 where f.id = n.entity_id
   and f.kind = 'show_and_tell'
   and n.type in ('comment', 'mention')
   and not (n.data ? 'post_kind');

-- ── 2 ──────────────────────────────────────────────────────────────────────
create or replace function public.guard_post_kind()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user in ('anon', 'authenticated') then
    if new.kind is distinct from old.kind then
      raise exception
        'forum_posts.kind cannot change: a post stays a post and a product stays a product'
        using errcode = '42501';
    end if;
    if old.kind = 'show_and_tell'
       and (new.link_url is null) is distinct from (old.link_url is null) then
      raise exception 'a product keeps its link (forum_posts.link_url)'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists forum_posts_guard_kind on public.forum_posts;
create trigger forum_posts_guard_kind
before update on public.forum_posts
for each row execute function public.guard_post_kind();

comment on function public.guard_post_kind() is
  'Refuses a self-service change to forum_posts.kind, and a show_and_tell row gaining or losing its link_url: a post stays a post and a product stays a product. Browser roles only (anon, authenticated), like 0078.';

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- As a product's author (set local role authenticated + request.jwt.claims):
--   update public.forum_posts set kind = 'post' where id = '<their product>';
--   -- expected: ERROR 42501  forum_posts.kind cannot change ...
--   update public.forum_posts set link_url = null where id = '<their product>';
--   -- expected: ERROR 42501  a product keeps its link ...
--   update public.forum_posts set content = content where id = '<their product>';
--   -- expected: UPDATE 1 — an ordinary edit is untouched.
