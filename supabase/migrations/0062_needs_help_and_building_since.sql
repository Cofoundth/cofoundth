-- ============================================================================
-- Two profile axes the matching model was missing. ADDITIVE.
--
--   needs_help_with — the DEMAND side. 0059 added `help_with` (what a member can
--     unblock for someone else) but stored nothing about what they need, so the
--     model was supply-only and there was nothing to match supply against. Same
--     vocabulary as help_with (lib/help-topics.ts), deliberately: "I can help
--     with pricing" ↔ "I need help with pricing" only pairs if both sides draw
--     from one list.
--
--   building_since — TIME in the current venture. `experience` already exists but
--     counts VENTURES (first_time / one_to_two / three_plus), which is a
--     different question: a second-time founder six weeks into a new company and
--     a first-timer five years in are opposites on this axis and identical on
--     that one.
--
-- building_since is an enum, matching how every other single-value profile field
-- is modelled (profile_stage, profile_commitment, profile_runway,
-- profile_experience in 0001) rather than free text with a check constraint.
--
-- THE GRANT AT THE BOTTOM IS NOT OPTIONAL. SELECT on public.profiles is granted
-- to `authenticated` column by column, so columns added later are invisible to
-- every signed-in user until named explicitly. 0059 omitted it and the entire
-- founder directory silently rendered empty — PostgREST rejects the whole
-- request when the select list touches one ungranted column, and the page's
-- `others ?? []` swallowed the error. See 0061. Any future ALTER TABLE ... ADD
-- COLUMN on this table must carry its own grant.
-- ============================================================================

create type profile_building_since as enum (
  'under_six_months',
  'six_to_twelve_months',
  'one_to_two_years',
  'two_to_five_years',
  'over_five_years'
);

alter table public.profiles
  add column if not exists needs_help_with text[] not null default '{}',
  add column if not exists building_since  profile_building_since;

comment on column public.profiles.needs_help_with is
  'Outcomes this member wants help WITH. Same vocabulary as help_with (lib/help-topics.ts) so the two sides can be matched against each other.';
comment on column public.profiles.building_since is
  'How long this member has been building their CURRENT venture. Distinct from `experience`, which counts how many ventures they have had.';

-- Filtered with the && overlap operator, same as activities/help_with in 0059.
create index if not exists profiles_needs_help_with_idx
  on public.profiles using gin (needs_help_with);
-- Single-value equality filter; btree is right here, not GIN.
create index if not exists profiles_building_since_idx
  on public.profiles (building_since);

grant select (needs_help_with, building_since) on public.profiles to authenticated;
