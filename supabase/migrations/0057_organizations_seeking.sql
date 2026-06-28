-- Partner/Funding directory tabs filter companies by what they're seeking.
-- The column was applied directly to the shared DB during development; this file
-- backfills the migration for repo reproducibility. Idempotent.
alter table public.organizations
  add column if not exists seeking text[] not null default '{}';

-- Column-level grant so authenticated users can read it (the directory query
-- selects `seeking`). Writes go through the membership-checked create action.
grant select (seeking) on public.organizations to authenticated;
