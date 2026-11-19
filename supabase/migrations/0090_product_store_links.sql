-- Products can declare Mobile and link to either or both mobile app stores.
-- Existing platform declarations and primary links remain valid.
begin;

alter table public.forum_posts
  add column if not exists ios_store_url text,
  add column if not exists android_store_url text;

alter table public.forum_posts
  drop constraint if exists forum_posts_platforms_known,
  add constraint forum_posts_platforms_known
    check (platforms <@ array['web', 'mobile', 'ios', 'android', 'windows', 'mac']::text[]),
  drop constraint if exists forum_posts_product_store_links,
  add constraint forum_posts_product_store_links check (
    (ios_store_url is null and android_store_url is null) or (
      kind = 'show_and_tell'
      and platforms && array['mobile', 'ios', 'android']::text[]
      and (ios_store_url is null or char_length(ios_store_url) between 1 and 2048)
      and (android_store_url is null or char_length(android_store_url) between 1 and 2048)
    )
  );

commit;
