-- Unify posting: forum_posts becomes the single post model.
-- Status updates (status/milestone/show_and_tell) fold into forum_posts.

-- 1. Schema: title optional; add kind, image_url, link_url.
alter table public.forum_posts alter column title drop not null;
alter table public.forum_posts add column if not exists kind text not null default 'post';
alter table public.forum_posts add column if not exists image_url text;
alter table public.forum_posts add column if not exists link_url text;

alter table public.forum_posts drop constraint if exists forum_posts_kind_check;
alter table public.forum_posts add constraint forum_posts_kind_check
  check (kind in ('post','milestone','show_and_tell'));

-- 2. Migrate status_updates -> forum_posts, preserving id (so likes remap cleanly).
insert into public.forum_posts (id, author_id, title, content, tags, kind, link_url, created_at)
select s.id, s.author_id, null, s.content, '{}'::text[],
       case s.kind::text when 'status' then 'post' else s.kind::text end,
       s.link_url, s.created_at
from public.status_updates s
where not exists (select 1 from public.forum_posts p where p.id = s.id);

-- 3. Migrate status_likes -> forum_likes (status_id == forum_posts.id after step 2).
insert into public.forum_likes (post_id, user_id)
select sl.status_id, sl.user_id
from public.status_likes sl
where exists (select 1 from public.forum_posts p where p.id = sl.status_id)
  and not exists (
    select 1 from public.forum_likes fl
    where fl.post_id = sl.status_id and fl.user_id = sl.user_id
  );

-- index to keep the merged feed ordering fast
create index if not exists forum_posts_created_at_idx on public.forum_posts (created_at desc);
create index if not exists forum_posts_kind_idx on public.forum_posts (kind);
