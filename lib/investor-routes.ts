// The ONE definition of what an investor account may reach.
//
// Investors are funding actors and read-first community members: they can read
// the funding surface, the community feed, meetups, the company directory,
// profiles and their own settings. Everything else — the founder dashboard,
// the co-founder directory, connections/DMs, B2B actions — is founder-only, and
// so is every WRITE (posting, RSVPing, proposing), which is enforced separately
// inside the individual server actions.
//
// This lives in its own module because it is enforced in TWO places and the two
// copies must never drift:
//
//   1. proxy.ts (middleware) — the REAL gate. Middleware runs on every request,
//      including the RSC fetches that a client-side navigation makes.
//   2. app/(app)/layout.tsx — defence in depth for a full page load.
//
// Why both: a layout guard ALONE is not a gate. Next does not re-render a shared
// layout on client-side navigation, so a layout redirect only fires on a hard
// load. An investor clicking a link straight through to /dashboard was NOT
// redirected — verified against the running app, not reasoned about. Middleware
// is the only layer that reliably sees every navigation.
export function isInvestorReadableRoute(pathname: string): boolean {
  return (
    pathname === "/investor" ||
    pathname === "/funding" ||
    pathname.startsWith("/funding/") ||
    pathname === "/community" ||
    // ...but not composing a new thread.
    (pathname.startsWith("/community/") &&
      !pathname.startsWith("/community/new")) ||
    // Meetups on the same read-first terms as the feed. RSVP and hosting are
    // writes and are refused server-side in app/(app)/meetups/actions.ts;
    // /meetups/new is the hosting form, excluded here like /community/new.
    pathname === "/meetups" ||
    (pathname.startsWith("/meetups/") &&
      !pathname.startsWith("/meetups/new")) ||
    // The company directory and company profiles, but not the founder-to-founder
    // B2B actions (create / propose / chat).
    pathname === "/orgs" ||
    (pathname.startsWith("/orgs/") &&
      !pathname.startsWith("/orgs/new") &&
      !pathname.endsWith("/propose") &&
      !pathname.endsWith("/chat")) ||
    pathname.startsWith("/profile/") ||
    // The hub itself, not just /profile/[id]: the page redirects investors to
    // /investor on its own, and without this the middleware bounces them to
    // /funding before that redirect ever runs.
    pathname === "/profile" ||
    // Their own notifications are their own data.
    pathname === "/notifications" ||
    pathname === "/settings"
  );
}

/** Where a blocked investor is sent. */
export const INVESTOR_HOME = "/funding";

/**
 * Route prefixes that live inside the (app) shell. Used by the middleware to
 * skip the account-type lookup entirely for marketing, auth and asset requests,
 * so the extra query only happens where the answer can change anything.
 */
export function isAppShellRoute(pathname: string): boolean {
  return [
    "/dashboard",
    "/community",
    "/browse",
    "/matches",
    "/messages",
    "/interests",
    "/orgs",
    "/companies",
    "/funding",
    "/meetups",
    "/investor",
    "/profile",
    "/settings",
    "/admin",
  ].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
