-- Make "I am" (i_am) and "I'm bringing" (intent) multi-select.
--
-- Founders wear multiple hats (e.g. Technical AND Business), and intent can be
-- both "have an idea" and "have skills". Convert these scalar enum columns to
-- enum arrays, mirroring how looking_for / industry already work.
--
-- Existing scalar values are preserved as single-element arrays, so no data is
-- lost. Applied to the live DB via Supabase MCP on 2026-05-30.

alter table public.profiles
  alter column i_am type profile_role[]
  using (case when i_am is null then null else array[i_am] end);

alter table public.profiles
  alter column intent type profile_intent[]
  using (case when intent is null then null else array[intent] end);
