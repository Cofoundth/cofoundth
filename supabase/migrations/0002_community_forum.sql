-- CoFound.th Phase 1 — Community forum (basic)
--
-- Apply via Supabase Dashboard → SQL Editor.

create table forum_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references profiles (id) on delete cascade,
  title       text not null,
  content     text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint title_length   check (char_length(title)   between 1 and 200),
  constraint content_length check (char_length(content) between 1 and 5000)
);

create index forum_posts_author_idx on forum_posts (author_id);
create index forum_posts_recent_idx on forum_posts (created_at desc);

create trigger forum_posts_set_updated_at
before update on forum_posts
for each row execute function set_updated_at();

-- RLS ------------------------------------------------------------------

alter table forum_posts enable row level security;

create policy "forum_posts_select_authenticated"
  on forum_posts for select
  to authenticated
  using (true);

create policy "forum_posts_insert_self"
  on forum_posts for insert
  to authenticated
  with check (auth.uid() = author_id);

create policy "forum_posts_update_own"
  on forum_posts for update
  to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

create policy "forum_posts_delete_own"
  on forum_posts for delete
  to authenticated
  using (auth.uid() = author_id);

-- Reports table for admin moderation -----------------------------------

create type report_kind   as enum ('profile', 'message', 'post');
create type report_status as enum ('open', 'resolved', 'dismissed');

create table reports (
  id            uuid primary key default gen_random_uuid(),
  reporter_id   uuid not null references profiles (id) on delete cascade,
  target_kind   report_kind not null,
  target_id     uuid not null,
  reason        text not null,
  status        report_status not null default 'open',
  created_at    timestamptz not null default now(),
  resolved_at   timestamptz,

  constraint reason_length check (char_length(reason) between 5 and 1000)
);

create index reports_status_idx on reports (status, created_at desc);

alter table reports enable row level security;

create policy "reports_select_own"
  on reports for select
  to authenticated
  using (auth.uid() = reporter_id);

create policy "reports_insert_self"
  on reports for insert
  to authenticated
  with check (auth.uid() = reporter_id);
