-- Fix message-notification dedup: keep exactly ONE per conversation regardless
-- of read state (0032 only matched unread rows, so once a ping was marked read
-- the next message inserted a new row → they stacked). Collapse existing dupes,
-- enforce uniqueness at the DB level, and drop the read_at filter from the
-- upsert. Applied to the live DB via Supabase MCP on 2026-05-31.

-- 1) Collapse existing duplicates to the newest per conversation.
delete from public.notifications
where type = 'message' and id not in (
  select distinct on (recipient_id, entity_id) id
  from public.notifications
  where type = 'message'
  order by recipient_id, entity_id, created_at desc
);

-- 2) Enforce one message notification per (recipient, conversation).
create unique index if not exists notifications_one_message_per_convo
  on public.notifications (recipient_id, entity_id)
  where type = 'message';

-- 3) Upsert without the read_at filter → always one row, re-marked unread.
create or replace function public.notify_on_message()
  returns trigger language plpgsql security definer set search_path = public as $$
declare recip uuid; a uuid; b uuid; sender_name text;
begin
  select profile_a_id, profile_b_id into a, b from public.matches where id = new.match_id;
  if a is null then return new; end if;
  recip := case when new.sender_id = a then b else a end;
  if recip is null or recip = new.sender_id then return new; end if;
  select full_name into sender_name from public.profiles where id = new.sender_id;

  update public.notifications
     set created_at = now(),
         read_at = null,
         actor_id = new.sender_id,
         data = jsonb_build_object('actor_name', coalesce(sender_name, 'Someone'),
                                   'preview', left(new.content, 80))
   where recipient_id = recip
     and type = 'message'
     and entity_id = new.match_id;
  if not found then
    insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
    values (recip, new.sender_id, 'message', new.match_id,
            jsonb_build_object('actor_name', coalesce(sender_name, 'Someone'),
                               'preview', left(new.content, 80)));
  end if;
  return new;
exception when others then return new;
end; $$;
