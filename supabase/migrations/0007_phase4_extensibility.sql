-- Cofoundee — Phase 4 extensibility columns on `profiles`.
--
-- Phase 4 (Year 4+) introduces B2B partnership matching (company ↔ company).
-- Adding these columns now (nullable / defaulted) means Phase 4 won't need
-- a destructive migration of existing data. Zero impact on Phase 1 behavior.

create type profile_type as enum ('individual', 'company');

alter table profiles
  add column type profile_type not null default 'individual',
  add column company_name text,
  add column capabilities text[] not null default '{}';

-- Index for company-type queries (only useful in Phase 4 when companies exist).
create index profiles_type_idx on profiles (type);
create index profiles_capabilities_idx on profiles using gin (capabilities);
