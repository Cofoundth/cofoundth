// Admin allow-list for Phase 1 moderation.
//
// Set ADMIN_EMAILS as a comma-separated env var, e.g.:
//   ADMIN_EMAILS=alice@cofound.th,bob@cofound.th

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
