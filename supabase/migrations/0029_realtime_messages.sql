-- Stream new messages to open conversations over Supabase Realtime (managed
-- WebSocket), so the recipient sees messages without reloading. RLS still
-- applies to the realtime stream — only conversation participants receive rows.
-- We only subscribe to INSERTs, so default replica identity is sufficient.
-- Applied to the live DB via Supabase MCP on 2026-05-31.
alter publication supabase_realtime add table public.messages;
