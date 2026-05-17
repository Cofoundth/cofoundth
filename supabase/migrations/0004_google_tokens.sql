-- CoFound.th — Google OAuth provider tokens for Calendar/Meet API access.
--
-- We capture access + refresh tokens in /auth/callback (server-side, using
-- the service role) when the user grants Calendar scope. Server actions then
-- use these tokens to call Google Calendar API on the user's behalf.
--
-- RLS allows the user to *see* their own row (handy for "is Google connected?"
-- checks from the client) but never to write. All writes happen via service role.

create table user_google_tokens (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  access_token  text not null,
  refresh_token text,
  expires_at    timestamptz not null,
  scope         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger user_google_tokens_set_updated_at
before update on user_google_tokens
for each row execute function set_updated_at();

alter table user_google_tokens enable row level security;

create policy "user_google_tokens_select_own"
  on user_google_tokens for select
  to authenticated
  using (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE happen only via service role (no policy = no public access).
