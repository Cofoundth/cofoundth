-- Stop directory-wide email harvesting.
--
-- The SELECT policy `profiles_select_authenticated` is qual = true (every
-- logged-in user can read every profile row — required for the founder
-- directory). RLS is row-level, so it can't hide a single column; the `email`
-- column was riding along, letting any authenticated user pull all members'
-- emails via the REST API. Revoke column-level privileges from anon +
-- authenticated.
--
-- Legitimate, authorized email reads still work because they go through the
-- service_role client, which is unaffected:
--   - matched conversation "share contact" (messages/[matchId]/page.tsx)
--   - partnership-request notifications (companies/actions.ts)
--   - admin user + verification panels (admin/*)
revoke select (email), insert (email), update (email) on public.profiles from authenticated;
revoke select (email), insert (email), update (email) on public.profiles from anon;
