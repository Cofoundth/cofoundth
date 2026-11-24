-- Keep private venue details off the member-readable meetup row.
create table public.meetup_private_details (
  meetup_id uuid primary key references public.meetups(id)
    on delete cascade deferrable initially deferred,
  location text,
  online_url text,
  lat double precision,
  lng double precision
);

alter table public.meetup_private_details enable row level security;
revoke all on public.meetup_private_details from public, anon, authenticated;
grant select on public.meetup_private_details to authenticated;
grant all on public.meetup_private_details to service_role;

create policy meetup_private_details_read on public.meetup_private_details
  for select to authenticated
  using (exists (
    select 1 from public.meetups m
    where m.id = meetup_private_details.meetup_id
      and not public.is_blocked_pair(m.created_by, (select auth.uid()))
      and (
        m.created_by = (select auth.uid())
        or exists (
          select 1 from public.meetup_rsvps r
          where r.meetup_id = m.id and r.user_id = (select auth.uid())
            and r.status = 'going'
        )
      )
  ));

insert into public.meetup_private_details (meetup_id, location, online_url, lat, lng)
select id, location, online_url, lat, lng from public.meetups
where visibility = 'private';

update public.meetups
set location = null, online_url = null, lat = null, lng = null
where visibility = 'private';

alter table public.meetups add constraint meetups_private_details_hidden
  check (visibility <> 'private' or (
    location is null and online_url is null and lat is null and lng is null
  ));

-- Event editors submit a complete venue payload. Move it in the same
-- transaction as the event write, including when its visibility changes.
create function public.store_meetup_private_details()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.visibility = 'private' then
    insert into public.meetup_private_details (meetup_id, location, online_url, lat, lng)
    values (new.id, new.location, new.online_url, new.lat, new.lng)
    on conflict (meetup_id) do update
    set location = excluded.location, online_url = excluded.online_url,
        lat = excluded.lat, lng = excluded.lng;
    new.location := null;
    new.online_url := null;
    new.lat := null;
    new.lng := null;
  elsif tg_op = 'UPDATE' and old.visibility = 'private' then
    delete from public.meetup_private_details where meetup_id = new.id;
  end if;
  return new;
end;
$$;
revoke all on function public.store_meetup_private_details() from public, anon, authenticated;

create trigger meetup_store_private_details
  before insert or update of visibility, location, online_url, lat, lng on public.meetups
  for each row execute function public.store_meetup_private_details();

-- Serialize all seat grants for the same meetup, regardless of entry point.
-- The lock is compatible with the RSVP foreign key's KEY SHARE lock.
create function public.guard_meetup_seat()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  event public.meetups%rowtype;
begin
  if new.status <> 'going' then return new; end if;

  select * into event from public.meetups where id = new.meetup_id for no key update;
  if not found then return new; end if;

  -- Idempotent seat upserts and existing attendees remain valid at capacity.
  if exists (
    select 1 from public.meetup_rsvps
    where meetup_id = new.meetup_id and user_id = new.user_id and status = 'going'
  ) then return new; end if;

  if event.created_by <> new.user_id
     and (event.status <> 'published' or event.starts_at <= clock_timestamp()) then
    raise exception 'meetup_closed';
  end if;

  if event.capacity is not null and (
    select count(*) from public.meetup_rsvps
    where meetup_id = new.meetup_id and status = 'going'
  ) >= event.capacity then
    raise exception 'meetup_full';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_meetup_seat() from public, anon, authenticated;

create trigger meetup_guard_seat
  before insert or update of status, meetup_id, user_id on public.meetup_rsvps
  for each row execute function public.guard_meetup_seat();

create function public.guard_meetup_capacity()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.capacity is not null and (
    select count(*) from public.meetup_rsvps
    where meetup_id = new.id and status = 'going'
  ) > new.capacity then
    raise exception 'meetup_capacity_below_attendance';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_meetup_capacity() from public, anon, authenticated;
create trigger meetup_guard_capacity
  before update of capacity on public.meetups for each row
  when (old.capacity is distinct from new.capacity)
  execute function public.guard_meetup_capacity();

-- Publish the event and its host's seat together.
create function public.publish_hosted_meetup(meetup_values jsonb)
returns uuid language plpgsql security invoker set search_path = ''
as $$
declare
  event_id uuid;
begin
  insert into public.meetups (
    slug, title, description, category, topic, format, location, online_url,
    starts_at, ends_at, capacity, status, image_url, visibility, lat, lng, created_by
  )
  select slug, title, description, category, topic, format, location, online_url,
    starts_at, ends_at, capacity, 'published', image_url, visibility, lat, lng, created_by
  from jsonb_populate_record(null::public.meetups, meetup_values)
  returning id into event_id;

  insert into public.meetup_rsvps (meetup_id, user_id, status)
  select id, created_by, 'going' from public.meetups where id = event_id;

  return event_id;
end;
$$;
revoke all on function public.publish_hosted_meetup(jsonb) from public, anon, authenticated;
grant execute on function public.publish_hosted_meetup(jsonb) to service_role;

-- Atomically answer an invite and, on acceptance, claim the seat. The action
-- verifies the caller's account and blocks before calling this service RPC.
create function public.answer_meetup_invite(
  event_id uuid, attendee_id uuid, accept_invite boolean
)
returns void language plpgsql security invoker set search_path = ''
as $$
begin
  update public.meetup_invites set status = case when accept_invite then 'accepted' else 'declined' end
  where meetup_id = event_id and invitee_id = attendee_id and status = 'pending';
  if not found then raise exception 'meetup_invite_answered'; end if;

  if accept_invite then
    insert into public.meetup_rsvps (meetup_id, user_id, status)
    values (event_id, attendee_id, 'going')
    on conflict (meetup_id, user_id) do update set status = excluded.status;
  end if;
end;
$$;
revoke all on function public.answer_meetup_invite(uuid, uuid, boolean) from public, anon, authenticated;
grant execute on function public.answer_meetup_invite(uuid, uuid, boolean) to service_role;

create function public.notify_meetup_change()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  notice_type text;
begin
  if old.status = 'published' and new.status = 'cancelled' then
    notice_type := 'meetup_cancelled';
  elsif old.status = 'published' and new.status = 'published'
    and (old.starts_at, old.ends_at) is distinct from (new.starts_at, new.ends_at) then
    notice_type := 'meetup_rescheduled';
  else
    return new;
  end if;

  insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
  select a.user_id, new.created_by, notice_type, new.id,
    jsonb_build_object('slug', new.slug, 'title', new.title)
  from (
    select user_id from public.meetup_rsvps
    where meetup_id = new.id and (status = 'going' or notice_type = 'meetup_cancelled')
    union
    select invitee_id from public.meetup_invites
    where meetup_id = new.id and status = 'pending' and notice_type = 'meetup_cancelled'
  ) a
  where a.user_id <> new.created_by
    and not public.is_blocked_pair(new.created_by, a.user_id);
  return new;
end;
$$;
revoke all on function public.notify_meetup_change() from public, anon, authenticated;
create trigger meetup_notify_change
  after update of status, starts_at, ends_at on public.meetups
  for each row execute function public.notify_meetup_change();

-- Chat closes with the event when it is cancelled. Prior attendees can still
-- talk after a completed event, while their RSVP is in place.
drop policy meetup_messages_select_attendees on public.meetup_messages;
drop policy meetup_messages_insert_attendees on public.meetup_messages;

create function public.can_access_meetup_chat(event_id uuid)
returns boolean language sql stable security invoker set search_path = ''
as $$
  select exists (
    select 1 from public.meetup_rsvps r
    join public.meetups m on m.id = r.meetup_id
    where r.meetup_id = event_id and r.user_id = (select auth.uid())
      and r.status = 'going' and m.status = 'published'
      and not public.is_blocked_pair(m.created_by, (select auth.uid()))
  );
$$;
revoke all on function public.can_access_meetup_chat(uuid) from public, anon;
grant execute on function public.can_access_meetup_chat(uuid) to authenticated;

create policy meetup_messages_select_attendees on public.meetup_messages
  for select to authenticated
  using (public.can_access_meetup_chat(meetup_id));
create policy meetup_messages_insert_attendees on public.meetup_messages
  for insert to authenticated
  with check (author_id = (select auth.uid()) and public.can_access_meetup_chat(meetup_id));
