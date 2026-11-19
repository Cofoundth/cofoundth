-- New product comments and rating writes require a like by the same member.
-- Existing feedback remains readable and removable after a member unlikes.
begin;

create policy product_ratings_require_like_on_insert
  on public.product_ratings as restrictive for insert to authenticated
  with check (
    exists (
      select 1 from public.forum_likes as liked
      where liked.post_id = product_ratings.post_id
        and liked.user_id = (select auth.uid())
    )
  );

create policy product_ratings_require_like_on_update
  on public.product_ratings as restrictive for update to authenticated
  using (true)
  with check (
    exists (
      select 1 from public.forum_likes as liked
      where liked.post_id = product_ratings.post_id
        and liked.user_id = (select auth.uid())
    )
  );

create policy forum_comments_require_product_like
  on public.forum_comments as restrictive for insert to authenticated
  with check (
    exists (
      select 1 from public.forum_posts as post
      where post.id = forum_comments.post_id
        and (
          post.kind is distinct from 'show_and_tell'
          or exists (
            select 1 from public.forum_likes as liked
            where liked.post_id = post.id
              and liked.user_id = (select auth.uid())
          )
        )
    )
  );

commit;
