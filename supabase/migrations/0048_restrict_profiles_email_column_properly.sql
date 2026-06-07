-- 0047 was a no-op: a TABLE-level SELECT grant to `authenticated` covers every
-- column, so the column-level REVOKE never actually restricted `email` (a
-- table-level grant outranks a column-level revoke in Postgres).
--
-- Correct pattern for hiding one column: drop the table-level SELECT grant and
-- re-grant SELECT on every column EXCEPT email.
--
-- service_role keeps its own table-level grant, so server/admin email reads
-- (matched-conversation share-contact, partnership notifications, admin panels)
-- still work. anon is already blocked from every profile row by RLS, so email
-- is unreachable for anon regardless.
revoke select on public.profiles from authenticated;
grant select (
  id, full_name, age, location, photo_url, linkedin_url, i_am, intent,
  looking_for, industry, stage, commitment, runway, experience, pitch,
  why_this, skills, verified, onboarded, created_at, updated_at, type,
  company_name, capabilities, slug, partnership_seeking, status_tags,
  background, work_experience, education, first_name, last_name, locale,
  instagram_url, facebook_url, x_url, is_admin, suspended, is_bot,
  project_url, project_images, profile_complete
) on public.profiles to authenticated;
