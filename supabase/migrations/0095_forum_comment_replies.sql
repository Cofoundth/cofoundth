alter table public.forum_comments
  add column parent_comment_id uuid,
  add constraint forum_comments_id_post_key unique (id, post_id),
  add constraint forum_comments_parent_on_same_post
    foreign key (parent_comment_id, post_id) references public.forum_comments (id, post_id)
    on delete set null (parent_comment_id);

create index forum_comments_parent_idx on public.forum_comments (parent_comment_id)
  where parent_comment_id is not null;

-- Replies must target an existing comment. Keeping the link fixed prevents
-- cycles; removing a parent detaches its replies without deleting their text.
create function public.guard_comment_parent()
returns trigger language plpgsql security definer set search_path = '' as $$
declare parent_author uuid;
begin
  if new.parent_comment_id is null then return new; end if;
  if tg_op = 'UPDATE' then
    if new.parent_comment_id is distinct from old.parent_comment_id then
      raise exception 'a reply cannot change its parent comment' using errcode = '23514';
    end if;
    return new;
  end if;
  select author_id into parent_author from public.forum_comments
    where id = new.parent_comment_id and post_id = new.post_id;
  if parent_author is null or new.parent_comment_id = new.id or exists (
    select 1 from public.profile_blocks
    where (blocker_id = new.author_id and blocked_id = parent_author)
       or (blocker_id = parent_author and blocked_id = new.author_id)
  ) then
    raise exception 'parent comment unavailable' using errcode = '23503';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_comment_parent() from public, anon, authenticated;

create trigger forum_comments_guard_parent
  before insert or update of parent_comment_id on public.forum_comments
  for each row execute function public.guard_comment_parent();

create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = '' as $$
declare post_author uuid; post_title text; post_kind text;
        parent_author uuid; actor_name text; payload jsonb;
begin
  select author_id, title, kind into post_author, post_title, post_kind
    from public.forum_posts where id = new.post_id;
  select author_id into parent_author from public.forum_comments where id = new.parent_comment_id;
  select full_name into actor_name from public.profiles where id = new.author_id;
  payload := jsonb_build_object('actor_name', coalesce(actor_name, 'Someone'),
                                'post_title', coalesce(post_title, ''),
                                'post_kind', coalesce(post_kind, 'post'));
  if parent_author is not null and parent_author <> new.author_id then
    insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
      values (parent_author, new.author_id, 'comment', new.post_id,
              payload || '{"is_reply":true}'::jsonb);
  end if;
  if post_author is not null and post_author <> new.author_id
     and post_author is distinct from parent_author then
    insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
      values (post_author, new.author_id, 'comment', new.post_id, payload);
  end if;
  return new;
exception when others then return new;
end;
$$;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;
