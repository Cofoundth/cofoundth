-- ============================================================================
-- Meetups, phase 4b: put the PRIVATE DOOR in Postgres.
--
-- 0072 introduced the door (status = 'requested', meetup_invites) and rested
-- the whole approval model on "there is no client UPDATE policy, so nobody can
-- self-approve". That reasoning was sound about UPDATE and silent about the
-- two policies that actually matter:
--
--   1. meetup_rsvps_insert_self (0058) is `with check (user_id = auth.uid())`
--      with NO predicate on `status`. No UPDATE is needed to self-approve —
--      DELETE your own row and INSERT it back as 'going'. Harmless while
--      'going' was the only legal value; privilege escalation the moment
--      'requested' became one. A seat also carries the attendee chat
--      (meetup_messages, 0072) and the right to invite others, so the one
--      unguarded INSERT hands over the entire private room.
--
--   2. meetup_rsvps_select_authenticated (0058) is `using (true)`. That was
--      exact for a roster ("the detail page shows who's going") and is wrong
--      for the new row class: 'requested' means "this founder asked to get
--      into a private room and has not been let in". 0072 got the identical
--      call right one table over (meetup_invites_select_parties) — this is
--      that decision, applied to the table that grew a confidential status.
--
-- The app filters both correctly (app/(app)/meetups/page.tsx gates requesters
-- on hostedIds, [slug]/page.tsx on isHost) but, per 0070's own argument, an
-- app-layer filter "holds for anyone using the UI and holds for nobody else".
--
-- Also here: blocking, and who may invite into a private meetup.
-- ============================================================================

-- ── meetup_rsvps SELECT: seats are public, knocks are not ───────────────────
-- A seat stays world-readable (the roster is the point). A 'requested' row is
-- readable by exactly two parties: the founder who knocked, and the host who
-- has to answer.
drop policy if exists meetup_rsvps_select_authenticated on public.meetup_rsvps;
create policy meetup_rsvps_select_authenticated on public.meetup_rsvps
  for select to authenticated
  using (
    status = 'going'
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.meetups m
      where m.id = meetup_rsvps.meetup_id
        and m.created_by = (select auth.uid())
    )
  );

-- ── meetup_rsvps INSERT: a member may knock, but may not seat themselves ────
-- Three things the old policy never said:
--   * 'going' on a PRIVATE meetup requires the host's yes — either the host is
--     you, or you hold an ACCEPTED invite (which is the host's earlier yes, and
--     is exactly the path rsvpAction's `preApproved` takes).
--   * 'requested' only means anything on a private meetup.
--   * a blocked pair never lands in the same room, in either direction. 0070
--     pushed this same predicate into `interests` and `messages`; meetups were
--     left app-layer only, so rsvpAction's block check could be walked around
--     with one direct PostgREST call.
-- Promotion 'requested' → 'going' remains service-role only (respondRequestAction
-- verifies meetups.created_by first); there is still deliberately no client
-- UPDATE policy.
drop policy if exists meetup_rsvps_insert_self on public.meetup_rsvps;
create policy meetup_rsvps_insert_self on public.meetup_rsvps
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.meetups m
      where m.id = meetup_rsvps.meetup_id
        and not public.is_blocked_pair(m.created_by, (select auth.uid()))
        and case
          when meetup_rsvps.status = 'going' then
            m.visibility = 'public'
            or m.created_by = (select auth.uid())
            or exists (
              select 1 from public.meetup_invites i
              where i.meetup_id = m.id
                and i.invitee_id = (select auth.uid())
                and i.status = 'accepted'
            )
          else m.visibility = 'private'
        end
    )
  );

-- ── meetup_invites INSERT: on a PRIVATE meetup, only the host invites ───────
-- 0072 let any attendee invite anyone, matching the reference app — but it
-- applied that to private meetups too, where an accepted invite converts
-- straight into a seat (respondInviteAction). One approved founder could then
-- seat twenty strangers in a room whose whole promise is "You choose who
-- joins", with no notification to the host and no way to undo it. Public
-- meetups keep attendee invites: there the invite is a convenience, not a key.
drop policy if exists meetup_invites_insert_attendees on public.meetup_invites;
create policy meetup_invites_insert_attendees on public.meetup_invites
  for insert to authenticated
  with check (
    inviter_id = (select auth.uid())
    and not public.is_blocked_pair(inviter_id, invitee_id)
    and exists (
      select 1
      from public.meetups m
      join public.meetup_rsvps r
        on r.meetup_id = m.id
       and r.user_id = (select auth.uid())
       and r.status = 'going'
      where m.id = meetup_invites.meetup_id
        and (m.visibility = 'public' or m.created_by = (select auth.uid()))
    )
  );
