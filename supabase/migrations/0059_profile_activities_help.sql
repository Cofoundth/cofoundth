-- ============================================================================
-- Two new profile axes. ADDITIVE — nothing existing changes shape.
--
-- Context: the platform's positioning widened from "Thai tech startups" to
-- "anyone in Thailand building a business". The industry list widens with it
-- (lib/industries.ts), and two axes are added that the product had no place
-- for before:
--
--   activities  — what a member would actually DO with another founder.
--                 This is the meetups engine. "Founders who run on Saturday"
--                 is a reason to show up; "FinTech founder in Bangkok" is not.
--
--   help_with   — OUTCOMES a member can unblock for someone else, e.g.
--                 "getting first customers", "registering a Thai company".
--                 Deliberately NOT the same axis as `skills`, which stays as
--                 hard skills (React, SEO). Skills describe a CV; help_with
--                 gives a stranger a reason to open a conversation.
--
-- Both mirror `industry` and `skills` from 0001: text[], not null, default {}.
-- Existing rows get an empty array, so every profile stays valid and the
-- onboarding/settings forms treat "not chosen yet" and "chose nothing" alike.
--
-- No RLS work needed: "profiles_update_own" (0001) is row-scoped, not
-- column-scoped, so a member can already write their own new columns, and the
-- public read policies expose whole rows.
-- ============================================================================

alter table public.profiles
  add column if not exists activities text[] not null default '{}',
  add column if not exists help_with  text[] not null default '{}';

comment on column public.profiles.activities is
  'Things this member would do with other founders (meetup matching). Values come from lib/activities.ts.';
comment on column public.profiles.help_with is
  'Outcomes this member can help another founder with. Values come from lib/help-topics.ts. Distinct from `skills` (hard skills).';

-- Filtering is "profiles overlapping any selected value", i.e. the && array
-- operator, which needs GIN to avoid a seq scan as the directory grows.
-- `industry` and `skills` predate this convention and are unindexed; these two
-- are indexed from the start rather than waiting for it to hurt.
create index if not exists profiles_activities_idx on public.profiles using gin (activities);
create index if not exists profiles_help_with_idx  on public.profiles using gin (help_with);
