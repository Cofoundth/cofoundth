-- A product try unlocks feedback for that member. Only the app's server
-- records attempts. Reading existing comments and commenting on other posts
-- continue to use their existing policies.
begin;

create table if not exists public.product_tries (
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.forum_posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create index if not exists product_tries_product_idx on public.product_tries(product_id);

alter table public.product_tries enable row level security;
revoke all on public.product_tries from public, anon, authenticated;
grant select on public.product_tries to authenticated;
grant select, insert on public.product_tries to service_role;

drop policy if exists product_tries_read_own on public.product_tries;
create policy product_tries_read_own on public.product_tries
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists forum_comments_require_product_try on public.forum_comments;
create policy forum_comments_require_product_try on public.forum_comments
  as restrictive for insert to authenticated
  with check (
    exists (
      select 1
      from public.forum_posts as post
      where post.id = forum_comments.post_id
        and (
          post.kind is distinct from 'show_and_tell'
          or post.author_id = (select auth.uid())
          or exists (
            select 1 from public.product_tries as attempt
            where attempt.product_id = post.id
              and attempt.user_id = (select auth.uid())
          )
        )
    )
  );

commit;
