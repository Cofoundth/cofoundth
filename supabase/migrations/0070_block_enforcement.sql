-- 0070: block enforcement at the DATABASE, not just in the app.
--
-- 0069 shipped the block list; the exclusion it buys is entirely app-layer
-- (lib/blocking.ts post-filters feeds, and the server actions refuse). That
-- holds for anyone using the UI and holds for nobody else: a blocked member
-- with their own JWT can call PostgREST directly and insert an `interests`
-- row or a `messages` row straight past every check in the Next app. The
-- policies below make the refusal a Postgres one, so the block survives a
-- hand-rolled request.
--
-- SECURITY DEFINER on the helper is REQUIRED, not decoration: profile_blocks
-- RLS (0069) exposes only rows where blocker_id = auth.uid(), so a caller
-- can never see that the OTHER party blocked THEM. A plain stable function
-- would run under the caller's RLS and return false for exactly the
-- direction that matters. `set search_path = public` pins resolution so the
-- definer's elevated rights can't be aimed at a shadowed table.

create or replace function public.is_blocked_pair(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profile_blocks
    where (blocker_id = a and blocked_id = b)
       or (blocker_id = b and blocked_id = a)
  );
$$;

revoke all on function public.is_blocked_pair(uuid, uuid) from public;
grant execute on function public.is_blocked_pair(uuid, uuid) to authenticated, service_role;

-- interests: no new interest in either direction once a block exists.
-- Original predicate (0001): auth.uid() = from_profile_id.
alter policy "interests_insert_self" on public.interests
  with check (
    auth.uid() = from_profile_id
    and not public.is_blocked_pair(from_profile_id, to_profile_id)
  );

-- messages: a match that predates the block stays readable (history is not
-- deleted) but takes no new messages from either side.
-- Original predicate (0001): sender is the caller AND the caller is a party
-- to the match.
alter policy "messages_insert_in_match" on public.messages
  with check (
    auth.uid() = sender_id
    and exists (
      select 1
      from matches m
      where m.id = messages.match_id
        and (m.profile_a_id = auth.uid() or m.profile_b_id = auth.uid())
    )
    and not exists (
      select 1
      from public.matches m
      where m.id = messages.match_id
        and public.is_blocked_pair(m.profile_a_id, m.profile_b_id)
    )
  );
