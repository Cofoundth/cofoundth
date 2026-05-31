-- In-app notifications: bring-back mechanics (the #1 early-community retention lever).
-- Events captured via AFTER INSERT triggers (security definer, exception-safe so they
-- can NEVER break the source insert): comment on your post, interest received,
-- mutual match, profile view. Applied to the live DB via Supabase MCP on 2026-05-31.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  type text not null,                       -- 'interest' | 'match' | 'comment' | 'profile_view'
  entity_id uuid,                           -- post id / match id (for deep links)
  data jsonb not null default '{}'::jsonb,  -- snapshot payload (actor_name, post_title…)
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using ((select auth.uid()) = recipient_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);
-- No INSERT/DELETE policy: rows are created only by the definer triggers below.

-- ── Comment on your post ─────────────────────────────────────────────
create or replace function public.notify_on_comment()
  returns trigger language plpgsql security definer set search_path = public as $$
declare post_author uuid; post_title text; actor_name text;
begin
  select author_id, title into post_author, post_title
    from public.forum_posts where id = new.post_id;
  if post_author is null or post_author = new.author_id then return new; end if;
  select full_name into actor_name from public.profiles where id = new.author_id;
  insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
  values (post_author, new.author_id, 'comment', new.post_id,
          jsonb_build_object('actor_name', coalesce(actor_name, 'Someone'),
                             'post_title', coalesce(post_title, '')));
  return new;
exception when others then return new;
end; $$;
revoke execute on function public.notify_on_comment() from public, anon, authenticated;
drop trigger if exists trg_notify_on_comment on public.forum_comments;
create trigger trg_notify_on_comment after insert on public.forum_comments
  for each row execute function public.notify_on_comment();

-- ── Interest received ────────────────────────────────────────────────
create or replace function public.notify_on_interest()
  returns trigger language plpgsql security definer set search_path = public as $$
declare actor_name text;
begin
  if new.to_profile_id = new.from_profile_id then return new; end if;
  select full_name into actor_name from public.profiles where id = new.from_profile_id;
  insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
  values (new.to_profile_id, new.from_profile_id, 'interest', new.id,
          jsonb_build_object('actor_name', coalesce(actor_name, 'A founder')));
  return new;
exception when others then return new;
end; $$;
revoke execute on function public.notify_on_interest() from public, anon, authenticated;
drop trigger if exists trg_notify_on_interest on public.interests;
create trigger trg_notify_on_interest after insert on public.interests
  for each row execute function public.notify_on_interest();

-- ── Mutual match (notify both sides) ─────────────────────────────────
create or replace function public.notify_on_match()
  returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (recipient_id, actor_id, type, entity_id)
  values (new.profile_a_id, new.profile_b_id, 'match', new.id),
         (new.profile_b_id, new.profile_a_id, 'match', new.id);
  return new;
exception when others then return new;
end; $$;
revoke execute on function public.notify_on_match() from public, anon, authenticated;
drop trigger if exists trg_notify_on_match on public.matches;
create trigger trg_notify_on_match after insert on public.matches
  for each row execute function public.notify_on_match();

-- ── Profile view (deduped to 1/viewer/day by the source upsert) ──────
create or replace function public.notify_on_profile_view()
  returns trigger language plpgsql security definer set search_path = public as $$
declare actor_name text;
begin
  if new.viewer_id = new.viewed_id then return new; end if;
  select full_name into actor_name from public.profiles where id = new.viewer_id;
  insert into public.notifications (recipient_id, actor_id, type, entity_id, data)
  values (new.viewed_id, new.viewer_id, 'profile_view', null,
          jsonb_build_object('actor_name', coalesce(actor_name, 'Someone')));
  return new;
exception when others then return new;
end; $$;
revoke execute on function public.notify_on_profile_view() from public, anon, authenticated;
drop trigger if exists trg_notify_on_profile_view on public.profile_views;
create trigger trg_notify_on_profile_view after insert on public.profile_views
  for each row execute function public.notify_on_profile_view();
