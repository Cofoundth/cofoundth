-- ============================================================================
-- Messages, phase 2: EDIT (15 min) and UNSEND (24 h), and the column guard
-- that has to exist before either is possible.
--
-- WHAT THE APP WANTS
--   * unsend, the way LINE does it: the text is really gone for both sides —
--     not hidden client-side — but the ROW stays, so the conversation keeps
--     its shape and its timestamps. `content` is emptied; `unsent_at` records
--     when, and is what every reader renders a tombstone from.
--   * edit, the way WhatsApp/Telegram do it (LINE has none): `content` is
--     rewritten inside 15 minutes and `edited_at` stamps a quiet marker. An
--     unsent message can never be edited — there is nothing left to edit.
--
-- WHY A TRIGGER, AND WHAT WAS ACTUALLY HOLDING THE LINE BEFORE
--   messages_update_recipient_read (0001) is
--       using (sender_id <> auth.uid() AND the caller is in the match)
--   with no WITH CHECK and — because RLS is row-level — no way to say WHICH
--   COLUMN may move. Read literally, it lets the RECIPIENT of a message
--   rewrite the SENDER's `content`: put words in someone's mouth, in their
--   own bubble, over their own name.
--
--   It does not, today, because of something nobody wrote down: `authenticated`
--   holds UPDATE on public.messages only at COLUMN level, and only on
--   `read_at`. Verified on prod before touching anything — a recipient
--   rewriting content is refused with 42501 permission denied, from the GRANT,
--   several steps before RLS is ever consulted.
--
--   That is luck, not design, and it is the exact shape 0048 already burned us
--   on ("a table-level grant outranks a column-level revoke"): `anon` still
--   holds table-wide UPDATE on this table, and one stray
--   `grant all on all tables in schema public to authenticated` — the Supabase
--   boilerplate everybody pastes — silently re-opens it with no migration and
--   no diff. The barrier is also about to move: the sender's edit runs under
--   the member's own JWT, so `authenticated` MUST gain UPDATE on `content`
--   here. The narrow grant stops being the wall the moment this migration
--   lands.
--
--   So the wall moves into a BEFORE UPDATE trigger, which is the one place
--   that can see OLD and NEW together. After this:
--       recipient  -> read_at, and nothing else, ever
--       sender     -> content / edited_at / unsent_at, inside the windows
--       everyone   -> id, match_id, sender_id, created_at are immutable
--   The windows are enforced HERE as well as in the server action, because
--   "the action checks it" is the same argument 0070 rejected: it holds for
--   anyone using the UI and holds for nobody else.
--
-- COMPATIBILITY BAR — the code on prod right now must keep working unchanged.
--   markConversationRead() does `update messages set read_at = now()` as the
--   recipient. That is the trigger's allowed path, it is the grant it already
--   has, and it is covered by a refusal test. Everything else is additive:
--   two nullable columns, one new policy, one new trigger, one widened grant.
--   No drops, no renames, no column made NOT NULL.
-- ============================================================================

-- ── columns ─────────────────────────────────────────────────────────────────
-- Both nullable with no default: null means "never edited" / "not unsent",
-- which is what every row in the table is today, so the backfill is a no-op
-- and old code that never selects them cannot notice.
alter table public.messages add column if not exists edited_at timestamptz;
alter table public.messages add column if not exists unsent_at timestamptz;

comment on column public.messages.edited_at is
  'When the sender last edited this message (15-minute window). Null = never edited.';
comment on column public.messages.unsent_at is
  'When the sender unsent this message (24-hour window). Non-null means `content` '
  'has been emptied on purpose and readers must render a tombstone, not a blank bubble.';

-- ── the emptied-content constraint ──────────────────────────────────────────
-- content stays NOT NULL (dropping that would break every reader that assumes
-- a string), so an unsent message carries ''. The 0001 constraint forbids
-- exactly that, so it is replaced — not loosened — with the same rule made
-- conditional: a LIVE message still may not be blank, and an UNSENT one must
-- be. Existing rows are all (unsent_at null, content non-empty) and validate
-- unchanged; prod code only ever inserts non-empty content, so it never meets
-- the new half.
alter table public.messages drop constraint if exists content_not_empty;
alter table public.messages add constraint content_not_empty check (
  (unsent_at is null and char_length(trim(content)) > 0)
  or (unsent_at is not null and content = '')
);

-- ── grants ──────────────────────────────────────────────────────────────────
-- SELECT is table-wide for `authenticated` here (checked — messages is not
-- profiles, which is column-scoped and cost us 0061), so the two new columns
-- are readable without a grant.
--
-- UPDATE is the column-scoped one: `authenticated` has read_at only. The
-- sender's edit/unsend runs under the member's JWT, so it needs these three —
-- and no more. sender_id, match_id, created_at and id stay ungranted, so the
-- trigger's immutability check is the SECOND lock on them, not the only one.
grant update (content, edited_at, unsent_at) on public.messages to authenticated;

-- ── the sender's UPDATE policy ──────────────────────────────────────────────
-- 0001 gave UPDATE to the recipient only; the sender has never had a row to
-- update. USING picks the rows, WITH CHECK pins the result — both say "this
-- is my own message in a match I am part of". Neither can speak about
-- columns or about OLD values; that is the trigger's job, below.
--
-- Deliberately WITHOUT the 0070 block predicate. A block freezes NEW contact;
-- it must not trap text a member already regrets sending. Unsend is the one
-- action that only ever REMOVES, and taking it away from a blocked pair would
-- punish the wrong person. The server action still refuses the whole thread
-- while a block stands, because the thread itself is unreachable (the page
-- 404s) — this policy is about what is possible, not about what the UI offers.
drop policy if exists messages_update_own_sender on public.messages;
create policy messages_update_own_sender on public.messages
  for update to authenticated
  using (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and ((select auth.uid()) = m.profile_a_id or (select auth.uid()) = m.profile_b_id)
    )
  )
  with check (
    sender_id = (select auth.uid())
    and exists (
      select 1 from public.matches m
      where m.id = messages.match_id
        and ((select auth.uid()) = m.profile_a_id or (select auth.uid()) = m.profile_b_id)
    )
  );

-- ── the column guard ────────────────────────────────────────────────────────
-- SECURITY INVOKER on purpose: this function needs no privilege of its own,
-- it only compares values it is handed. search_path is pinned anyway so a
-- shadowed `auth` schema cannot redirect auth.uid().
--
-- errcode 'check_violation' (23514) rather than a bare raise: PostgREST maps
-- it to a 4xx, so a hand-rolled request gets a refusal and not a 500, and the
-- server action can tell "you broke a rule" from "the database fell over".
create or replace function public.messages_guard_update()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := (select auth.uid());
  v_age interval := now() - OLD.created_at;
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

drop trigger if exists trg_messages_guard_update on public.messages;
create trigger trg_messages_guard_update
  before update on public.messages
  for each row execute function public.messages_guard_update();
