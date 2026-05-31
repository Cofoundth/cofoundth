-- A new message drops a notification for the recipient, so the app-wide bell
-- surfaces it on ANY page (the realtime socket is unreliable; the bell polls).
-- Deduped: one unread "message" notification per conversation — a new message
-- bumps the existing unread one instead of stacking, so you get a single ping
-- per chat until you read it. Applied to the live DB via Supabase MCP 2026-05-31.
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
     and entity_id = new.match_id
     and read_at is null;
  if not found then
    insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
    values (recip, new.sender_id, 'message', new.match_id,
            jsonb_build_object('actor_name', coalesce(sender_name, 'Someone'),
                               'preview', left(new.content, 80)));
  end if;
  return new;
exception when others then return new;
end; $$;
revoke execute on function public.notify_on_message() from public, anon, authenticated;
drop trigger if exists trg_notify_on_message on public.messages;
create trigger trg_notify_on_message after insert on public.messages
  for each row execute function public.notify_on_message();
