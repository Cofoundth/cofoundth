-- ============================================================================
-- Company Organizations — ADDITIVE.
--
-- The individual founder / co-founder layer (`profiles` + matching) is left
-- completely untouched. A company becomes a first-class entity that MANY users
-- can belong to, separate from any single person's profile. A user always has
-- their founder profile AND can own / join one or more organizations.
--
-- Not wired to any UI yet — this is CTO prep on a feature branch.
-- ============================================================================

create table public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  slug                text unique not null,
  name                text not null,
  tagline             text,
  about               text,
  website             text,
  logo_url            text,
  industry            text[]  not null default '{}',
  capabilities        text[]  not null default '{}',  -- what the company offers
  partnership_seeking text[]  not null default '{}',  -- what it's looking for
  stage               text,
  location            text,
  verified            boolean not null default false,
  created_by          uuid not null references public.profiles(id) on delete restrict,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index organizations_created_by_idx on public.organizations(created_by);

create table public.org_members (
  org_id    uuid not null references public.organizations(id) on delete cascade,
  user_id   uuid not null references public.profiles(id)      on delete cascade,
  role      text not null default 'member' check (role in ('owner','admin','member')),
  joined_at timestamptz not null default now(),
  primary key (org_id, user_id)
);
create index org_members_user_idx on public.org_members(user_id);

create table public.org_invites (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  email      text not null,
  role       text not null default 'member' check (role in ('admin','member')),
  status     text not null default 'pending'
             check (status in ('pending','accepted','declined','revoked')),
  invited_by uuid not null references public.profiles(id) on delete cascade,
  token      uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  unique (org_id, email)
);
create index org_invites_email_idx on public.org_invites(lower(email));
create index org_invites_token_idx on public.org_invites(token);

-- Membership/role lookup. SECURITY DEFINER so RLS policies on org_members /
-- organizations can check the caller's role WITHOUT recursing into org_members'
-- own RLS. Locked down per the project's definer-function convention
-- (search_path pinned, execute revoked from public/anon).
create or replace function public.org_role(p_org uuid, p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.org_members where org_id = p_org and user_id = p_user;
$$;
revoke execute on function public.org_role(uuid, uuid) from public, anon;
grant  execute on function public.org_role(uuid, uuid) to authenticated, service_role;

-- ---------------------------------- RLS ------------------------------------
alter table public.organizations enable row level security;
alter table public.org_members  enable row level security;
alter table public.org_invites  enable row level security;

-- organizations: any signed-in user can browse the directory; you create your
-- own; only owner/admin edit; only owner deletes. (auth.uid() wrapped in a
-- subselect per the project's RLS perf convention, migration 0014.)
create policy organizations_select_authenticated on public.organizations
  for select to authenticated using (true);

create policy organizations_insert_self on public.organizations
  for insert to authenticated
  with check (created_by = (select auth.uid()));

create policy organizations_update_admins on public.organizations
  for update to authenticated
  using      (public.org_role(id, (select auth.uid())) in ('owner','admin'))
  with check (public.org_role(id, (select auth.uid())) in ('owner','admin'));

create policy organizations_delete_owner on public.organizations
  for delete to authenticated
  using (public.org_role(id, (select auth.uid())) = 'owner');

-- org_members: team rosters are readable (company page shows the team).
-- Direct client INSERT is intentionally blocked — membership is granted by the
-- create-org and accept-invite server actions (service_role). Owner/admin can
-- change roles + remove members; a member can remove themself.
create policy org_members_select_authenticated on public.org_members
  for select to authenticated using (true);

create policy org_members_update_admins on public.org_members
  for update to authenticated
  using (public.org_role(org_id, (select auth.uid())) in ('owner','admin'));

create policy org_members_delete_admin_or_self on public.org_members
  for delete to authenticated
  using (
    public.org_role(org_id, (select auth.uid())) in ('owner','admin')
    or user_id = (select auth.uid())
  );

-- org_invites: an org's owner/admin manage its invites; the invited person
-- (matched by the email claim in their JWT) can see + respond to theirs.
create policy org_invites_select_admin_or_invitee on public.org_invites
  for select to authenticated
  using (
    public.org_role(org_id, (select auth.uid())) in ('owner','admin')
    or lower(email) = lower((select auth.jwt() ->> 'email'))
  );

create policy org_invites_insert_admins on public.org_invites
  for insert to authenticated
  with check (
    public.org_role(org_id, (select auth.uid())) in ('owner','admin')
    and invited_by = (select auth.uid())
  );

create policy org_invites_update_admin_or_invitee on public.org_invites
  for update to authenticated
  using (
    public.org_role(org_id, (select auth.uid())) in ('owner','admin')
    or lower(email) = lower((select auth.jwt() ->> 'email'))
  );
