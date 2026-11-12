// A sign-in or sign-up link that brings the reader back afterwards.
//
// No "use client" and no imports: the product pages (server) and their join
// dialog (client) both build these, and a helper exported from a client module
// would reach a server component as a client reference it cannot call.

/**
 * `/login?next=%2Fp%2F<id>`. The destination is percent-encoded whole, so a
 * path that carries its own query survives the trip as one value.
 *
 * This only WRITES the parameter. Deciding whether a `next` is safe to follow
 * (a same-origin path and nothing else) belongs to the code that reads it —
 * the sign-in and sign-up pages and actions, the OAuth callback, onboarding —
 * and every one of them asks the same helper, lib/safe-next.ts. Never the page
 * that wrote it.
 */
export function authHref(base: "/login" | "/signup", next: string): string {
  return `${base}?next=${encodeURIComponent(next)}`;
}

/**
 * Where a sign-in lands when nothing asked for anywhere else: the product
 * deck. There is no dashboard any more (the owner's call, 2026-11-12) — the
 * shelf is the first page a member sees, as it is for a visitor. A GATED role
 * still lands on its own home instead (lib/roles.ts landingFor, which is what
 * the sign-in paths call); this is the ungated founder's, and the explorer's
 * home is the same page. /dashboard itself now redirects here (proxy.ts), so
 * old links, bookmarks and emails keep working.
 */
export const SIGN_IN_LANDING = "/products";

/**
 * `destination`, by way of onboarding: `/onboarding?next=<destination>`, which
 * onboarding's finish follows once the form is done. For a member who owes
 * onboarding (lib/roles.ts owesOnboarding) at the end of a sign-in.
 *
 * A destination that is already /onboarding is returned as it is, so nothing
 * is wrapped twice (signupAction already wraps a founder's `next` before it
 * reaches the callback). SIGN_IN_LANDING is the finish's own default, so it is
 * left off the URL. Like authHref this only writes the parameter; the
 * destination has already passed lib/safe-next.ts, and onboarding checks the
 * nested value again before following it.
 */
export function throughOnboarding(destination: string): string {
  if (destination.split(/[?#]/, 1)[0] === "/onboarding") return destination;
  if (destination === SIGN_IN_LANDING) return "/onboarding";
  return `/onboarding?next=${encodeURIComponent(destination)}`;
}
