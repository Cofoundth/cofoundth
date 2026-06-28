-- Investor (a user with account_type='investor') <-> Company (org) funding.
-- Mirrors org_connections / org_deals, but one side is an individual investor.
create table if not exists public.investor_connections (
  id           uuid primary key default gen_random_uuid(),
  investor_id  uuid not null references public.profiles(id) on delete cascade,
  org_id       uuid not null references public.organizations(id) on delete cascade,
  status       text not null default 'pending'
               check (status in ('pending','accepted','declined')),
  requested_by text not null check (requested_by in ('investor','company')),
  created_by   uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (investor_id, org_id)
);
create index if not exists investor_connections_investor_idx on public.investor_connections(investor_id);
create index if not exists investor_connections_org_idx on public.investor_connections(org_id);
create index if not exists investor_connections_created_by_idx on public.investor_connections(created_by);

alter table public.investor_connections enable row level security;
-- The investor themselves, or any member of the company, can see the connection.
create policy investor_connections_select on public.investor_connections
  for select to authenticated using (
    investor_id = (select auth.uid())
    or public.org_role(org_id, (select auth.uid())) is not null
  );
grant select on public.investor_connections to authenticated;

create table if not exists public.investor_deals (
  id            uuid primary key default gen_random_uuid(),
  connection_id uuid not null references public.investor_connections(id) on delete cascade,
  proposed_by   uuid not null references public.profiles(id) on delete cascade,
  proposer_side text not null check (proposer_side in ('investor','company')),
  equity_pct       numeric(5,2) check (equity_pct is null or (equity_pct >= 0 and equity_pct <= 100)),
  monthly_amount   numeric(15,2) check (monthly_amount is null or monthly_amount >= 0),
  monthly_currency text not null default 'THB',
  contract_months  int check (contract_months is null or (contract_months >= 0 and contract_months <= 600)),
  payment_terms    text check (payment_terms is null or char_length(payment_terms) <= 500),
  description      text check (description is null or char_length(description) <= 5000),
  status        text not null default 'proposed'
                check (status in ('proposed','confirmed','admin_review','signed','declined','cancelled')),
  confirmed_by  uuid references public.profiles(id),
  confirmed_at  timestamptz,
  fee_type      text not null default 'percent',
  fee_amount    numeric(15,2),
  fee_currency  text not null default 'THB',
  admin_notes   text,
  signed_at     timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists investor_deals_connection_idx on public.investor_deals(connection_id);

alter table public.investor_deals enable row level security;
-- The investor, or any member of the company, can see the deals on the connection.
create policy investor_deals_select on public.investor_deals
  for select to authenticated using (
    exists (
      select 1 from public.investor_connections c
      where c.id = investor_deals.connection_id
        and (
          c.investor_id = (select auth.uid())
          or public.org_role(c.org_id, (select auth.uid())) is not null
        )
    )
  );
grant select on public.investor_deals to authenticated;

notify pgrst, 'reload schema';
