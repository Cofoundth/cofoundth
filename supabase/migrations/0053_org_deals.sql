-- B2B deal/proposal flow (company <-> company), phase 1.
--
-- A deal hangs off an ACCEPTED org_connection. One company proposes terms; the
-- other confirms; once both agree it goes to ADMIN, who coordinates the IRL
-- contract signing (drafted by the partner law firm). Cofoundee just connects +
-- coordinates. Fee is a FLAT coordination fee, set by admin per deal (the column
-- also supports a percentage if that's ever chosen).
--
-- Generalises to investor<->company later: add deal_type values + an investor
-- party — no rebuild of this table.

create table public.org_deals (
  id             uuid primary key default gen_random_uuid(),
  connection_id  uuid not null references public.org_connections(id) on delete cascade,
  proposer_org   uuid not null references public.organizations(id) on delete cascade,
  responder_org  uuid not null references public.organizations(id) on delete cascade,
  proposed_by    uuid not null references public.profiles(id) on delete restrict,

  deal_type      text not null check (deal_type in (
                   'integration','distribution','white_label','co_marketing',
                   'vendor_supplier','partnership','other')),
  title          text not null,
  description    text not null,
  value_amount   numeric(15,2),
  value_currency text check (value_currency in ('THB','USD','EUR')),
  payment_terms  text,
  timeline       text,

  status         text not null default 'proposed'
                 check (status in ('proposed','confirmed','admin_review','signed','declined','cancelled')),
  confirmed_by   uuid references public.profiles(id),
  confirmed_at   timestamptz,

  -- Coordination fee. Defaults to a flat THB fee; admin sets the real amount.
  fee_type       text not null default 'fixed' check (fee_type in ('fixed','percentage')),
  fee_amount     numeric(15,2),
  fee_currency   text not null default 'THB',

  admin_notes    text,
  signed_at      timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint org_deals_distinct check (proposer_org <> responder_org)
);
create index org_deals_connection_idx on public.org_deals(connection_id);
create index org_deals_proposer_idx   on public.org_deals(proposer_org);
create index org_deals_responder_idx  on public.org_deals(responder_org);
create index org_deals_status_idx     on public.org_deals(status);

alter table public.org_deals enable row level security;

-- A member of EITHER company on the deal can read it. Writes (propose / confirm /
-- decline) go through server actions on the service-role client after verifying
-- membership — mirroring org_connections / org_members. Admins read all via the
-- service-role admin client.
create policy org_deals_select on public.org_deals
  for select to authenticated using (
    public.org_role(proposer_org, (select auth.uid())) is not null
    or public.org_role(responder_org, (select auth.uid())) is not null
  );
