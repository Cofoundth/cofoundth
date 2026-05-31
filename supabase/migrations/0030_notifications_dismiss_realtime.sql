-- Live notification bell: stream new notifications to the open bell, and let
-- users dismiss them. Applied to the live DB via Supabase MCP on 2026-05-31.
alter publication supabase_realtime add table public.notifications;

-- Allow a recipient to delete (dismiss) their own notifications.
drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete using ((select auth.uid()) = recipient_id);
