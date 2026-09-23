-- ============================================================================
-- Messages, phase 2b: the three holes 0074 left open.
--
-- 0074 shipped edit + unsend and moved the column wall into a BEFORE UPDATE
-- trigger. Three things it did not cover, each of which breaks a promise 0074
-- itself makes in its own header:
--
--   1. UNSEND DID NOT REACH THE NOTIFICATION COPY.  0033's notify_on_message
--      writes left(content, 80) into notifications.data->>'preview' at INSERT
--      time, and its trigger is AFTER INSERT only — so an unsend UPDATE never
--      re-runs it. The sender empties `content`, the bubble renders a
--      tombstone, and the first 80 characters are still sitting in a row the
--      RECIPIENT owns, shipped to their browser in the bell payload on every
--      app page. 0074's header says "the text is really gone for both sides —
--      not hidden client-side"; it was gone from one table. The sender cannot
--      fix it from their own session either: notifications_update_own is
--      `recipient_id = auth.uid()`, so the row is unreachable from the JWT
--      that owns the message. That is why this is a SECURITY DEFINER trigger
--      and not a second statement in the server action — no code running
--      under the member's identity can close it.
--      An EDIT has the same shape with the opposite sign: the preview keeps
--      the pre-edit wording forever. The same trigger refreshes it.
--
--   2. THE BLOCK PREDICATE STOPPED AT `insert`.  0070 exists to make a block
--      a Postgres refusal rather than an app-layer one ("it holds for anyone
--      using the UI and holds for nobody else"). messages_update_own_sender
--      leaves it out on purpose, and 0074 explains why — but the reason it
--      gives covers UNSEND only: "Unsend is the one action that only ever
--      REMOVES, and taking it away from a blocked pair would punish the wrong
--      person." An EDIT is not a removal. As written, a blocked member can
--      PATCH /rest/v1/messages directly and substitute new words into a
--      bubble the blocker reads on unblock — and which admin/reports reads
--      LIVE, with no content snapshot of its own, so a moderator sees
--      whatever the blocked sender last wrote.
--      Fixed where 0074 itself said it should be if unsend is to survive:
--      "gate it in the trigger (allow the unsend transition, refuse the edit
--      transition)". The POLICY is deliberately left alone, so unsend keeps
--      working for a blocked pair exactly as 0074 intended.
--
--   3. THE TWO AUDIT COLUMNS WERE CLIENT-CHOSEN FREE TEXT.  0074 grants
--      `update (content, edited_at, unsent_at)` to `authenticated` and then
--      checks only that edited_at is NOT NULL and that unsent_at moved
--      null -> non-null. Neither branch compares the submitted stamp to
--      anything, so `unsent_at = now() + interval '50 years'` is accepted, an
--      edit can back-date edited_at to before created_at, and a second edit
--      that re-sends the OLD edited_at freezes the marker across a real
--      content change. Nothing reads the VALUES today (every reader tests
--      null-ness), so this is latent — but these columns are the only record
--      of what happened to a message, and the first thing to read them (an
--      "unsent 5 minutes ago" label, a retention job, a moderation timeline)
--      would inherit an attacker-chosen timestamp.
--
-- COMPATIBILITY BAR — same as 0074's. Everything here is additive: one
-- function replaced in place (same name, same signature, same allowed paths
-- for every caller that was already legal), one new function, one new AFTER
-- trigger. No columns, no policies, no grants change. markConversationRead()
-- and the two server actions keep working unchanged, and are covered by the
-- refusal tests.
-- ============================================================================

-- ── the column guard, with the three missing checks ─────────────────────────
-- Replaced whole rather than patched, because a trigger function has no
-- partial form. Everything 0074 wrote is preserved verbatim; the additions are
-- marked (0075).
create or replace function public.messages_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_age interval := now() - OLD.created_at;
  -- (0075) How far ahead of the database's clock a stamp minted by the Next
  -- server may legitimately be. Generous enough that ordinary NTP drift
  -- between two managed hosts can never refuse a real edit, tight enough that
  -- "+50 years" is not a timestamp.
  v_skew interval := interval '5 minutes';
  v_blocked boolean;
begin
  -- No end-user identity on the connection = one of the app's own trusted
  -- paths: the service-role client, a migration, the SQL console, another
  -- trigger. Those are Cofoundee's own code and are not what this guard is
  -- about. Note this is NOT a hole for an anonymous PostgREST caller: every
  -- policy on this table is `to authenticated` and every one of them compares
  -- auth.uid(), so a caller without a sub claim selects no row to update in
  -- the first place.
  if v_uid is null then
    return NEW;
  end if;

  -- Immutable for everybody, sender included. `id` and `created_at` are the
  -- conversation's shape; `sender_id` is whose name is on the bubble;
  -- `match_id` is which conversation it belongs to. None of them is ever a
  -- legitimate edit.
  if NEW.id is distinct from OLD.id
     or NEW.match_id is distinct from OLD.match_id
     or NEW.sender_id is distinct from OLD.sender_id
     or NEW.created_at is distinct from OLD.created_at then
    raise exception 'messages: id, match_id, sender_id and created_at cannot be changed'
      using errcode = 'check_violation';
  end if;

  if v_uid = OLD.sender_id then
    -- ---- the sender ------------------------------------------------------
    -- A read receipt is the recipient's statement about themselves. The
    -- sender marking their own message read would forge it.
    if NEW.read_at is distinct from OLD.read_at then
      raise exception 'messages: the sender cannot change read_at'
        using errcode = 'check_violation';
    end if;

    -- Unsent is terminal. Nothing about an unsent message moves again —
    -- which is also, precisely, "an unsent message can never be edited".
    if OLD.unsent_at is not null then
      if NEW.content is distinct from OLD.content
         or NEW.edited_at is distinct from OLD.edited_at
         or NEW.unsent_at is distinct from OLD.unsent_at then
        raise exception 'messages: this message was unsent and can no longer be changed'
          using errcode = 'check_violation';
      end if;
      return NEW;
    end if;

    if NEW.unsent_at is distinct from OLD.unsent_at then
      -- ---- unsend ----
      -- OLD.unsent_at is null here (the branch above returned otherwise), so
      -- the only transition left is null -> a stamp.
      if NEW.unsent_at is null then
        raise exception 'messages: unsent_at cannot be cleared'
          using errcode = 'check_violation';
      end if;
      if v_age > interval '24 hours' then
        raise exception 'messages: the 24-hour unsend window has closed (message is % old)', v_age
          using errcode = 'check_violation';
      end if;
      -- (0075) The stamp is a fact about when this happened, not a field the
      -- caller gets to choose. It cannot precede the message it retracts and
      -- it cannot be in the future.
      if NEW.unsent_at < OLD.created_at or NEW.unsent_at > now() + v_skew then
        raise exception 'messages: unsent_at must be the time of the unsend, not %', NEW.unsent_at
          using errcode = 'check_violation';
      end if;
      -- The point of unsend is that the text is GONE, not hidden. A caller
      -- that stamps unsent_at while keeping the words would render a
      -- tombstone over text still sitting in the row and in every API reply.
      if NEW.content <> '' then
        raise exception 'messages: unsending must clear content'
          using errcode = 'check_violation';
      end if;
      return NEW;
    end if;

    if NEW.content is distinct from OLD.content then
      -- ---- edit ----
      if v_age > interval '15 minutes' then
        raise exception 'messages: the 15-minute edit window has closed (message is % old)', v_age
          using errcode = 'check_violation';
      end if;
      -- The marker is not optional. A silent rewrite is the thing that makes
      -- an edit feature feel like a trust leak.
      if NEW.edited_at is null then
        raise exception 'messages: an edit must stamp edited_at'
          using errcode = 'check_violation';
      end if;
      -- (0075) ...and it has to MOVE, and land in the same reality as the
      -- rest of the row. Re-sending OLD.edited_at would freeze the marker at
      -- the first edit while the words kept changing underneath it — the same
      -- silent rewrite, one step removed.
      if NEW.edited_at is not distinct from OLD.edited_at then
        raise exception 'messages: an edit must move edited_at'
          using errcode = 'check_violation';
      end if;
      if NEW.edited_at < OLD.created_at or NEW.edited_at > now() + v_skew then
        raise exception 'messages: edited_at must be the time of the edit, not %', NEW.edited_at
          using errcode = 'check_violation';
      end if;
      -- (0075) A block freezes NEW contact in both directions (0070). Unsend
      -- survives it on purpose — see the policy comment in 0074 — but an edit
      -- is not a removal: it puts NEW words in front of someone who has said
      -- they want none, and it rewrites the text a moderator reads live out
      -- of this same column. Checked here rather than in the policy so the
      -- two transitions can part company, which a row-level policy cannot
      -- express.
      select public.is_blocked_pair(m.profile_a_id, m.profile_b_id)
        into v_blocked
        from public.matches m
       where m.id = OLD.match_id;
      if coalesce(v_blocked, false) then
        raise exception 'messages: this conversation is closed and its messages cannot be edited'
          using errcode = 'check_violation';
      end if;
      return NEW;
    end if;

    -- Content did not move, so neither may the marker: stamping edited_at on
    -- its own is a lie in the other direction, and clearing it erases one.
    if NEW.edited_at is distinct from OLD.edited_at then
      raise exception 'messages: edited_at only moves together with content'
        using errcode = 'check_violation';
    end if;

    return NEW;
  end if;

  -- ---- anyone who is not the sender --------------------------------------
  -- In practice the recipient, since messages_update_recipient_read already
  -- requires the caller to be in the match. read_at, and nothing else.
  if NEW.content is distinct from OLD.content
     or NEW.edited_at is distinct from OLD.edited_at
     or NEW.unsent_at is distinct from OLD.unsent_at then
    raise exception 'messages: only the sender can change a message; you may set read_at only'
      using errcode = 'check_violation';
  end if;

  return NEW;
end;
$$;

revoke all on function public.messages_guard_update() from public, anon, authenticated;

-- ── the notification copy ───────────────────────────────────────────────────
-- SECURITY DEFINER, and that is the whole point: the row being fixed belongs
-- to the RECIPIENT (notifications_select_own / _update_own / _delete_own are
-- all `recipient_id = auth.uid()`), so the sender's JWT — and therefore the
-- server action running under it — has no reachable path to it. A verified
-- attempt returns rows=0, not an error. `set search_path = public` pins
-- resolution so the definer's rights cannot be aimed at a shadowed table,
-- same as 0070's helper.
--
-- WHICH ROW: notifications carries one message row per (recipient, match) —
-- the unique index from 0033 — holding the newest message from the other
-- party. `actor_id = sender` pins it to the notification THIS sender's
-- messages wrote. The newest-message test is what keeps an edit or an unsend
-- of an OLDER message from clobbering a preview that describes a later one:
-- only the message the preview was actually built from may rewrite it.
--
-- The two branches break the TIE in opposite directions, on purpose. created_at
-- defaults to now(), which is the TRANSACTION's clock, so two messages written
-- in one transaction carry the same stamp and neither is provably newer:
--   * unsend skips only for a STRICTLY newer message, so a tie still scrubs.
--     The worst case is a preview removed a moment early — the bell simply
--     shows no preview. The other direction would leave retracted words
--     readable, which is the whole defect.
--   * refresh skips for anything newer OR EQUAL, so a tie leaves the preview
--     alone rather than possibly replacing a newer message's text with an
--     older one's.
-- Availability of a preview yields to correctness; correctness yields to not
-- leaking.
--
-- NO `exception when others` here, deliberately — unlike notify_on_message,
-- which swallows so that a broken bell can never block a send. Swallowing on
-- THIS side would mean an unsend that reports success while the words stay
-- readable, which is the exact failure the trigger exists to prevent. If the
-- scrub cannot run, the unsend does not happen.
create or replace function public.messages_sync_notification_preview()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if NEW.unsent_at is not null then
    if exists (
      select 1 from public.messages m
       where m.match_id = NEW.match_id
         and m.sender_id = NEW.sender_id
         and m.created_at > NEW.created_at
    ) then
      return null;
    end if;
    -- The key is REMOVED, not blanked. Every reader already treats a missing
    -- preview as "no preview" (the bell never renders it; lib/email.ts reads
    -- it once, at send time, long before any unsend), and an absent key cannot
    -- be mistaken for a message whose text was the empty string.
    update public.notifications
       set data = data - 'preview'
     where type = 'message'
       and entity_id = NEW.match_id
       and actor_id = NEW.sender_id;
  else
    if exists (
      select 1 from public.messages m
       where m.match_id = NEW.match_id
         and m.sender_id = NEW.sender_id
         and m.id <> NEW.id
         and m.created_at >= NEW.created_at
    ) then
      return null;
    end if;
    update public.notifications
       set data = jsonb_set(
             coalesce(data, '{}'::jsonb), '{preview}', to_jsonb(left(NEW.content, 80)))
     where type = 'message'
       and entity_id = NEW.match_id
       and actor_id = NEW.sender_id;
  end if;

  return null;
end;
$$;

revoke all on function public.messages_sync_notification_preview() from public, anon, authenticated;

-- AFTER, not BEFORE: the copy must be derived from the row as it will actually
-- exist, and an AFTER trigger cannot be made to write a preview for an update
-- the guard is about to refuse — the guard's exception aborts the statement
-- before this ever runs.
drop trigger if exists trg_messages_sync_notification_preview on public.messages;
create trigger trg_messages_sync_notification_preview
  after update of content, unsent_at on public.messages
  for each row
  when (NEW.content is distinct from OLD.content
        or NEW.unsent_at is distinct from OLD.unsent_at)
  execute function public.messages_sync_notification_preview();
