-- ============================================================================
-- Meetups, phase 4: PRIVATE = REQUEST TO JOIN, plus founder-to-founder invites.
--
-- WHY private is no longer link-only.
--   0065 read the reference product's "Private" badge as unlisted-by-link,
--   because that was the only semantics this schema could keep: meetup_rsvps
--   had a single legal status ('going'), so there was nowhere to park "wants
--   in, not admitted yet". Measured against the live reference app, private
--   means something else entirely: the meetup IS listed, with a lock and the
--   word "Private" on the card, the button reads "Request to join", and the
--   host chooses who is let in ("Founders request a spot. You choose who
--   joins."). Link-only was the weaker promise AND the more surprising one —
--   a private meetup nobody can discover cannot fill.
--
--   So: the visibility column keeps its two values and its meaning shifts from
--   WHO CAN SEE IT (everyone, now) to HOW YOU GET IN (ask the host). The
--   listing filters in app/(app)/meetups/page.tsx come off in the same change.
--
-- Two rows model the two directions of that door:
--   meetup_rsvps.status = 'requested'  — the founder asked; not an attendee.
--   meetup_invites                     — the host (or any attendee) asked THEM.
--
-- Everything that counts a meetup's size, renders its roster, or gates its
-- chat must now say status = 'going' explicitly. A 'requested' row is a
-- knock on the door, not a seat.
-- ============================================================================

-- ── meetup_rsvps: 'requested' becomes a legal status ────────────────────────
-- Cancelling a request is still a DELETE (meetup_rsvps_delete_self, 0058), so
-- no new policy is needed for the founder side. There is deliberately NO
-- client UPDATE policy: promoting 'requested' → 'going' is the HOST's decision
-- and runs on the service role from respondRequestAction, which verifies
-- meetups.created_by = caller first. Giving the row's owner UPDATE would let
-- anyone self-approve.
alter table public.meetup_rsvps
  drop constraint if exists meetup_rsvps_status_check;
alter table public.meetup_rsvps
  add constraint meetup_rsvps_status_check
  check (status in ('going','requested'));

-- ── meetup_messages: attendees only, and a requester is not an attendee ─────
-- 0068's policies asked only "does an rsvp row exist", which was exact while
-- 'going' was the only status. It is now a hole: a pending requester would
-- read and write the attendee chat of a meetup they were never admitted to.
drop policy if exists meetup_messages_select_attendees on public.meetup_messages;
create policy meetup_messages_select_attendees on public.meetup_messages
  for select to authenticated
  using (exists (
    select 1 from public.meetup_rsvps r
    where r.meetup_id = meetup_messages.meetup_id
      and r.user_id = (select auth.uid())
      and r.status = 'going'
  ));

drop policy if exists meetup_messages_insert_attendees on public.meetup_messages;
create policy meetup_messages_insert_attendees on public.meetup_messages
  for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and exists (
      select 1 from public.meetup_rsvps r
      where r.meetup_id = meetup_messages.meetup_id
        and r.user_id = (select auth.uid())
        and r.status = 'going'
    )
  );

-- ── meetup_invites ──────────────────────────────────────────────────────────
-- One pending invite per (meetup, invitee) — the PK is the dedupe. The
-- inviter is remembered so the notification can name them and so a withdraw
-- is attributable.
create table public.meetup_invites (
  meetup_id  uuid not null references public.meetups(id)  on delete cascade,
  inviter_id uuid not null references public.profiles(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending'
             check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  primary key (meetup_id, invitee_id),
  constraint meetup_invites_not_self check (inviter_id <> invitee_id)
);
create index meetup_invites_invitee_idx on public.meetup_invites(invitee_id);

alter table public.meetup_invites enable row level security;

-- An invite is private to its two parties — unlike the RSVP roster, which the
-- detail page shows to the room. (auth.uid() in a subselect per 0014.)
create policy meetup_invites_select_parties on public.meetup_invites
  for select to authenticated
  using ((select auth.uid()) in (inviter_id, invitee_id));

-- You may only invite to a meetup you are actually going to. The host qualifies
-- automatically (hosting auto-RSVPs, see hostMeetupAction).
create policy meetup_invites_insert_attendees on public.meetup_invites
  for insert to authenticated
  with check (
    inviter_id = (select auth.uid())
    and exists (
      select 1 from public.meetup_rsvps r
      where r.meetup_id = meetup_invites.meetup_id
        and r.user_id = (select auth.uid())
        and r.status = 'going'
    )
  );

-- Accept / decline your own invite.
create policy meetup_invites_update_invitee on public.meetup_invites
  for update to authenticated
  using (invitee_id = (select auth.uid()))
  with check (invitee_id = (select auth.uid()));

-- Withdraw one you sent.
create policy meetup_invites_delete_inviter on public.meetup_invites
  for delete to authenticated
  using (inviter_id = (select auth.uid()));
