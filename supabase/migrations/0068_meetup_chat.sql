-- Per-meetup group chat — the reference app's Messages > Meetups tab.
-- Attendees-only in BOTH directions: you read and write a meetup's chat only
-- while your RSVP row exists. The host is always an attendee (hosting
-- auto-RSVPs), so every chat has at least its host.

create table public.meetup_messages (
  id         uuid primary key default gen_random_uuid(),
  meetup_id  uuid not null references public.meetups(id)  on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null
             constraint meetup_message_length
             check (char_length(trim(content)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index meetup_messages_meetup_idx
  on public.meetup_messages(meetup_id, created_at);

alter table public.meetup_messages enable row level security;

create policy meetup_messages_select_attendees on public.meetup_messages
  for select to authenticated
  using (exists (
    select 1 from public.meetup_rsvps r
    where r.meetup_id = meetup_messages.meetup_id
      and r.user_id = (select auth.uid())
  ));

create policy meetup_messages_insert_attendees on public.meetup_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.meetup_rsvps r
      where r.meetup_id = meetup_messages.meetup_id
        and r.user_id = (select auth.uid())
    )
  );

-- Delete your own message; no edits in v1.
create policy meetup_messages_delete_own on public.meetup_messages
  for delete to authenticated
  using (author_id = (select auth.uid()));
