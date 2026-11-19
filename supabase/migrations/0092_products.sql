-- Give products their own identity while keeping their existing listings and
-- engagement. The listing can be removed without deleting the product ID.
begin;

create table public.products (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid unique references public.forum_posts(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  platforms text[] not null default '{}',
  ios_store_url text,
  android_store_url text,
  constraint products_listing_id_matches_id check (listing_id is null or listing_id = id),
  constraint products_platforms_known
    check (platforms <@ array['web', 'mobile', 'ios', 'android', 'windows', 'mac']::text[]),
  constraint products_store_links check (
    (ios_store_url is null and android_store_url is null) or (
      platforms && array['mobile', 'ios', 'android']::text[]
      and (ios_store_url is null or char_length(ios_store_url) between 1 and 2048)
      and (android_store_url is null or char_length(android_store_url) between 1 and 2048)
    )
  )
);

create index products_owner_idx on public.products(owner_id);

alter table public.products enable row level security;
revoke all on public.products from public, anon, authenticated, service_role;
grant select on public.products to authenticated, service_role;

create policy products_select_listed on public.products
  for select to authenticated
  using (
    exists (
      select 1
      from public.forum_posts as listing
      where listing.id = products.listing_id
        and (listing.hidden = false or listing.author_id = (select auth.uid()))
    )
  );

-- Existing clients save the listing through its existing RLS and write guards.
-- The trigger saves the product in that same transaction. The old availability
-- columns remain writable during rollout so either app version can save a listing.
create function public.sync_product_listing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.kind = 'show_and_tell' then
    insert into public.products (
      id, listing_id, owner_id, created_at, platforms, ios_store_url, android_store_url
    ) values (
      new.id, new.id, new.author_id, new.created_at, new.platforms,
      new.ios_store_url, new.android_store_url
    )
    on conflict (listing_id) do update set
      owner_id = excluded.owner_id,
      platforms = excluded.platforms,
      ios_store_url = excluded.ios_store_url,
      android_store_url = excluded.android_store_url;
  elsif tg_op = 'UPDATE' and old.kind = 'show_and_tell' then
    update public.products set listing_id = null where listing_id = old.id;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_product_listing() from public, anon, authenticated, service_role;

-- Install the trigger before copying rows. CREATE TRIGGER locks out concurrent
-- listing writes until this transaction commits.
create trigger forum_posts_sync_product_listing
  after insert or update of kind, author_id, platforms, ios_store_url, android_store_url
  on public.forum_posts
  for each row execute function public.sync_product_listing();

insert into public.products (
  id, listing_id, owner_id, created_at, platforms, ios_store_url, android_store_url
)
select id, id, author_id, created_at, platforms, ios_store_url, android_store_url
from public.forum_posts
where kind = 'show_and_tell';

notify pgrst, 'reload schema';

commit;
