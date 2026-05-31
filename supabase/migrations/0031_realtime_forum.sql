-- Live community: surface new posts on the feed and new comments on a thread
-- without a manual reload. INSERT-only subscriptions, default replica identity.
-- Applied to the live DB via Supabase MCP on 2026-05-31.
alter publication supabase_realtime add table public.forum_posts;
alter publication supabase_realtime add table public.forum_comments;
