-- Native "Background" field — a light, optional track-record line ("what you've
-- built / where you've been") so founders can screen who's worth a conversation
-- without depending on LinkedIn (low usage in Thailand) or a heavy résumé form.
-- Nullable, non-breaking. Applied to the live DB via Supabase MCP on 2026-05-31.
alter table public.profiles add column if not exists background text;
