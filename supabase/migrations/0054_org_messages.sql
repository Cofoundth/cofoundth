-- Company-to-company chat. One thread per accepted org_connection; any member
-- of either company can read + post. Mirrors the org_connections/org_deals
-- design: SELECT via RLS (org_role on either side), writes via a service-role
-- server action that verifies membership + sets sender_org.
create table if not exists public.org_messages (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.org_connections(id) on delete cascade,
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  sender_org    uuid not null references public.organizations(id) on delete cascade,
  body          text not null check (char_length(body) between 1 and 2000),
  created_at    timestamptz not null default now()
);
create index if not exists org_messages_connection_idx
  on public.org_messages(connection_id, created_at);
create index if not exists org_messages_sender_idx on public.org_messages(sender_id);
create index if not exists org_messages_sender_org_idx on public.org_messages(sender_org);

alter table public.org_messages enable row level security;

-- A member of EITHER company in the connection can read the whole thread.
create policy org_messages_select on public.org_messages
  for select to authenticated using (
    exists (
      select 1 from public.org_connections c
      where c.id = org_messages.connection_id
        and (
          public.org_role(c.requester_org, (select auth.uid())) is not null
          or public.org_role(c.target_org, (select auth.uid())) is not null
        )
    )
  );
-- No client insert/update/delete policy — writes go through sendOrgMessageAction
-- on the service-role client (verifies accepted connection + caller membership).

grant select on public.org_messages to authenticated;

notify pgrst, 'reload schema';
