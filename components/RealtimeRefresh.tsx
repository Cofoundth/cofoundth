// The live "new posts — tap to refresh" pill is disabled.
//
// It relied on a client-side Supabase realtime socket, which needs a
// JS-readable session token. Auth tokens are now HttpOnly (managed strictly
// server-side, so client JS / XSS can't read them), so the browser has no
// token to open an authenticated socket. The realtime socket was already
// failing in production anyway (CHANNEL_ERROR → the pill never appeared).
//
// The feed still refreshes on navigation. If a live indicator is wanted back,
// re-add it as a server-action poll (like the notification bell now does).
// Kept as a no-op so the dashboard/community callers don't need to change.
export function RealtimeRefresh(_props: {
  table: string;
  filter?: string;
  currentUserId: string;
  senderColumn?: string;
  kind: "posts" | "comments";
}) {
  void _props;
  return null;
}
