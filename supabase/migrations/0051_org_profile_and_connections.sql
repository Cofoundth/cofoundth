-- B2B company module, round 2:
--   * richer company profile: pitch (what we do), product link + images, Calendly
--   * company <-> company connections (the gate for "นัดคุย" / scheduling)
--   * a public bucket for company logos + product images
-- Additive; the founder/profile layer is untouched.

-- ---- Company profile fields ------------------------------------------------
alter table public.organizations
  add column if not exists pitch         text,
  add column if not exists product_url   text,
  add column if not exists product_images text[] not null default '{}',
  add column if not exists calendly_url  text;

-- Pitch is "what the company does" — capped (~200 words ≈ 1000 chars). Thai has
-- no word boundaries, so we bound by characters. Enforced non-empty at the
-- server action; the column stays nullable for legacy rows.
alter table public.organizations
  drop constraint if exists org_pitch_length;
alter table public.organizations
  add constraint org_pitch_length
  check (pitch is null or char_length(pitch) <= 1000);

-- ---- Company <-> company connections ---------------------------------------
create table public.org_connections (
  id            uuid primary key default gen_random_uuid(),
  requester_org uuid not null references public.organizations(id) on delete cascade,
  target_org    uuid not null references public.organizations(id) on delete cascade,
  status        text not null default 'pending'
                check (status in ('pending', 'accepted', 'declined')),
  created_by    uuid not null references public.profiles(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint org_connections_distinct check (requester_org <> target_org),
  unique (requester_org, target_org)
);
create index org_connections_requester_idx on public.org_connections(requester_org);
create index org_connections_target_idx    on public.org_connections(target_org);

alter table public.org_connections enable row level security;

-- A member of EITHER company can see the connection (org_role returns the
-- caller's role in that org, or null if not a member). Writes (request / accept /
-- decline) go through server actions on the service-role client, mirroring the
-- org_members / org_invites design — so no client insert/update/delete policy.
create policy org_connections_select on public.org_connections
  for select to authenticated using (
    public.org_role(requester_org, (select auth.uid())) is not null
    or public.org_role(target_org, (select auth.uid())) is not null
  );

-- ---- Storage: company logos + product images -------------------------------
-- Public bucket; uploads run through the service-role client (Storage doesn't
-- validate this project's ES256 user JWTs), reads are public.
insert into storage.buckets (id, name, public)
values ('org-images', 'org-images', true)
on conflict (id) do nothing;
