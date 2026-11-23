begin;

alter table public.products
  add column is_curated boolean not null default false,
  add column curated_maker_name text,
  add constraint products_curated_maker_name_check check (
    curated_maker_name is null or (
      is_curated and char_length(btrim(curated_maker_name)) between 1 and 100
    )
  );

-- The listing trigger creates each product record. Credit it in the same
-- transaction, so no reader sees an imported listing with the admin's byline.
-- Draft IDs make a retry after a lost response safe.
create function public.publish_curated_products(publisher_id uuid, entries jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  inserted_ids uuid[];
begin
  if not exists (
    select 1 from public.profiles
    where id = publisher_id and account_type = 'founder'
      and suspended = false and is_bot is not true
  ) then
    raise exception 'curated_product_publisher_unavailable';
  end if;

  if entries is null or jsonb_typeof(entries) <> 'array'
     or jsonb_array_length(entries) not between 1 and 50 then
    raise exception 'invalid_curated_product_batch';
  end if;

  with inserted as (
    insert into public.forum_posts (
      id, author_id, kind, title, content, tags, platforms,
      link_url, ios_store_url, android_store_url, image_url, image_urls
    )
    select entry.id, publisher_id, 'show_and_tell', entry.title, entry.content,
      array[entry.category], entry.platforms, entry.link_url, entry.ios_store_url,
      entry.android_store_url, entry.image_urls[1], entry.image_urls
    from jsonb_to_recordset(entries) as entry(
      id uuid, title text, content text, category text, platforms text[],
      link_url text, ios_store_url text, android_store_url text, image_urls text[]
    )
    on conflict (id) do nothing
    returning id
  )
  select array(select id from inserted) into inserted_ids;

  update public.products as product
  set is_curated = true, curated_maker_name = entry.maker_name
  from jsonb_to_recordset(entries) as entry(id uuid, maker_name text)
  where product.id = entry.id and product.id = any(inserted_ids);

  if (
    select count(*)
    from public.products
    where id in (select entry.id from jsonb_to_recordset(entries) as entry(id uuid))
      and owner_id = publisher_id and is_curated and listing_id is not null
  ) <> jsonb_array_length(entries) then
    raise exception 'curated_product_batch_conflict';
  end if;
end;
$$;

revoke all on function public.publish_curated_products(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.publish_curated_products(uuid, jsonb) to service_role;

notify pgrst, 'reload schema';

commit;
