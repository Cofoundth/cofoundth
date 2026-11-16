-- 0082: a link-less legacy show_and_tell may GAIN a link.
--
-- 0081's guard_post_kind() refused a show_and_tell row's link changing in
-- EITHER direction. One direction was a mistake. There is one show_and_tell
-- row with no link — a Show & tell post from before products had their own
-- form — and its maker can only edit it through updateProductAction
-- (lib/post-actions.ts), which requires a link like adding a product does. So
-- 0081 made every save of that row fail with "Couldn’t save your changes"
-- while My products and its page still offered Edit. Found in review, before
-- anyone hit it.
--
-- Gaining a link does not change what the row IS: it is kind 'show_and_tell'
-- before and after, and the kind check above it is what keeps a post a post
-- and a product a product. (A member can also INSERT a show_and_tell row with
-- a link directly — forum_posts_insert_self has no kind clause, see
-- lib/posts.ts — so refusing the update protected nothing.) Refusing a product
-- LOSING its link stays: a product on the shelf stays something to try.
--
-- Same function, same trigger (0081's forum_posts_guard_kind); only the link
-- condition changes.

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
       and old.link_url is not null
       and new.link_url is null then
      raise exception 'a product keeps its link (forum_posts.link_url)'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

comment on function public.guard_post_kind() is
  'Refuses a self-service change to forum_posts.kind, and a show_and_tell row losing its link_url: a post stays a post and a product stays a product. A link-less legacy row may gain one (0082). Browser roles only (anon, authenticated), like 0078.';

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- As a product's author (set local role authenticated + request.jwt.claims):
--   update ... set kind = 'post'     -> ERROR 42501 (unchanged)
--   update ... set link_url = null   -> ERROR 42501 (unchanged)
-- And on a show_and_tell row whose link_url is null, as its author:
--   update ... set link_url = 'https://example.com'  -> UPDATE 1
