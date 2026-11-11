// The ONE definition of account roles: what each one may READ (routes) and what
// each one may DO (the write ladder). Everything else in the app imports from
// here rather than comparing account_type to a string literal.
//
// THREE ROLES, and the middle one is genuinely in the middle:
//
//   founder  — makes something, wants users + partners. The unrestricted
//              default; every unknown value resolves here.
//   explorer — here to TRY what the community builds and say what they think.
//              Reads the shelf and the feed, COMMENTS and RSVPs, and starts
//              nothing. Feedback is the entire value an explorer brings, so
//              blocking comments would defeat the role.
//   investor — backs startups. Read-first everywhere, writes nowhere (likes
//              aside). The signup OPTION is hidden behind
//              FEATURES.investorSignup, but the role itself is LIVE: there are
//              real investor accounts in production, and /investor, /funding
//              and every investor gate keep working for them.
//
// Explorer is NOT "investor plus a bit" or "founder minus a bit". The two
// gated roles' route lists diverge in BOTH directions — /funding, /investor and
// /orgs are investor-readable and explorer-blocked, while the explorer reads
// the community feed and meetups, which an investor reads on different terms —
// so they are two independent predicates behind one dispatcher, never a delta
// off each other. A tier order would be a lie that the next reader builds on.
//
// NOTE (2026-11): /products used to be the clearest example of that divergence
// — explorer home, investor-blocked. It is now a PUBLIC marketing route, so the
// gate never evaluates it for anybody and it is no longer an example of
// anything. See EXPLORER_HOME below for what replaced the mechanism, and
// isAppShellRoute for why it left that list.
//
// ---------------------------------------------------------------------------
// WHY ROUTE ACCESS LIVES IN ITS OWN MODULE (prose carried over from
// lib/investor-routes.ts, which this replaces — it records a real bug)
// ---------------------------------------------------------------------------
// It is enforced in TWO places and the two copies must never drift:
//
//   1. proxy.ts (middleware) — the REAL gate. Middleware runs on every request,
//      including the RSC fetches that a client-side navigation makes.
//   2. app/(app)/layout.tsx — defence in depth for a full page load.
//
// Why both: a layout guard ALONE is not a gate. Next does not re-render a
// shared layout on client-side navigation, so a layout redirect only fires on a
// hard load. An investor clicking a link straight through to /dashboard was NOT
// redirected — verified against the running app, not reasoned about. Middleware
// is the only layer that reliably sees every navigation.
//
// And route gating is NOT the write boundary. A server action is invocable
// without ever rendering the page it belongs to, so every founder-only write
// checks the ladder below for itself. Routes decide what a role can LOOK at;
// the can* predicates decide what it can DO.

export const ACCOUNT_ROLES = ["founder", "explorer", "investor"] as const;
export type AccountRole = (typeof ACCOUNT_ROLES)[number];

/** The unrestricted default. Anything unrecognised resolves here. */
export const DEFAULT_ROLE: AccountRole = "founder";

/**
 * The ONE place a string becomes a role. Used by the signup action, the OAuth
 * callback, and every reader of profiles.account_type.
 *
 * Fails OPEN to "founder" on purpose: founder is the unrestricted default, so a
 * null row, a missing column grant or a typo degrades to the behaviour the app
 * had before roles existed. Failing CLOSED would lock every founder out of
 * their own app the first time a query forgot to select account_type.
 *
 * Note this RECOGNISES "investor" — hiding the signup option
 * (FEATURES.investorSignup) is a different question from parsing a role that
 * real production accounts already hold. Callers that must refuse a NEW
 * investor signup check that flag themselves, after parsing.
 */
export function parseAccountRole(value: unknown): AccountRole {
  return (ACCOUNT_ROLES as readonly string[]).includes(value as string)
    ? (value as AccountRole)
    : DEFAULT_ROLE;
}

// ---------------------------------------------------------------------------
// Where a blocked role is sent
// ---------------------------------------------------------------------------
// Both MUST be readable by their own role or the gate redirects X -> X forever.
// Asserted at the bottom of this file, because the investor gate only avoided
// that loop by coincidence: "/funding" happens to sit in the investor
// allowlist, and nothing said so.

/**
 * Where a blocked explorer is sent. The maker shelf is their home surface.
 *
 * IT IS A PUBLIC ROUTE (app/(marketing)/products), and that is deliberate:
 * anonymous visitors browse the shelf and sign in only when they want to
 * comment, which makes /products the page the explorer role CONVERTS INTO.
 *
 * The mechanism that gets an explorer here therefore changed, and the new one
 * is worth stating because it is one layer shorter than the old one:
 *
 *   before  proxy.ts saw /products in isAppShellRoute, read account_type, and
 *           let the explorer through because ROLE_ACCESS.explorer.canRead
 *           listed it.
 *   now     /products is outside isAppShellRoute, so proxy.ts short-circuits
 *           before the role lookup and NOBODY is gated on it — an explorer
 *           arrives because the route is public, not because they are
 *           allowlisted. The bounces still work unchanged: proxy.ts's "/"
 *           redirect and every `roleHome(role)` caller (app/(auth)/actions.ts,
 *           app/auth/callback/route.ts, app/onboarding/*, the gate's own
 *           `bounce(home)`) send them to this string, and the destination now
 *           answers everybody.
 *
 * ROLE_ACCESS.explorer.canRead still lists it anyway — see the note there.
 */
export const EXPLORER_HOME = "/products";
/** Where a blocked investor is sent. */
export const INVESTOR_HOME = "/funding";

/**
 * The Add product page, app/(app)/products/new — the ONE place a product is
 * written from (createProductAction), quietly: it lands on the deck and its own
 * page and is never announced in the feed (CLAUDE.md, Language Rules).
 *
 * Unlike /products it is INSIDE the (app) shell, so it is in isAppShellRoute
 * below and the gate evaluates it: a founder writes there, an explorer reads it
 * (it explains the shelf is for builders and offers Switch to building, which
 * ends back here after onboarding), and an investor is bounced to /funding.
 * Every "put something on the shelf" link points here, by this name.
 */
export const ADD_PRODUCT_PATH = "/products/new";

/**
 * Per-role route access. `home: null` means the role is ungated — it may read
 * everything, so there is nowhere to bounce it to.
 */
export const ROLE_ACCESS: Record<
  AccountRole,
  { home: string | null; canRead: (pathname: string) => boolean }
> = {
  // The unrestricted default. No allowlist to maintain, nowhere to bounce to.
  founder: { home: null, canRead: () => true },

  // An explorer came to try things and talk about them. Reads the shelf, the
  // feed and meetups; starts no thread, hosts no meetup, posts no product.
  explorer: {
    home: EXPLORER_HOME,
    canRead: (pathname) =>
      // The maker shelf — their home. /products is a MARKETING route now, so
      // the gate never actually evaluates it (see isAppShellRoute) — exactly
      // the standing /insights has two entries below. It stays listed as a
      // FORWARD GUARD: moving the shelf back into the (app) shell must not
      // silently block the one page this role is sent to, and the invariant at
      // the bottom of this file reads this entry to say so.
      //
      // /products/* IS evaluated: ADD_PRODUCT_PATH (/products/new) is inside
      // the shell, and an explorer READS it on purpose. Posting is still
      // refused (canPostProduct, below, and in createProductAction); what the
      // page shows them is why, and the Switch to building control that turns
      // them into someone who can. Blocking the route instead would bounce an
      // explorer who followed "Add yours" back to the shelf with no word.
      pathname === "/products" ||
      pathname.startsWith("/products/") ||
      pathname === "/community" ||
      // Threads yes (they comment there), composing a new one no.
      (pathname.startsWith("/community/") &&
        !pathname.startsWith("/community/new")) ||
      // Meetups are where an explorer goes to try things in person, so they
      // RSVP (see canRsvpMeetup) — but /meetups/new is the hosting form.
      pathname === "/meetups" ||
      (pathname.startsWith("/meetups/") &&
        !pathname.startsWith("/meetups/new")) ||
      // Reading the insights blog. /insights is a MARKETING route, so the gate
      // never actually evaluates it (see isAppShellRoute) — it is listed so
      // that if it is ever moved into the (app) shell it does not silently
      // become blocked.
      pathname === "/insights" ||
      pathname.startsWith("/insights/") ||
      // Their own identity, and other members' profiles — an explorer is a
      // comment author and a meetup attendee, so profiles are a normal
      // destination for them.
      pathname === "/profile" ||
      pathname.startsWith("/profile/") ||
      // Their own notifications are their own data.
      pathname === "/notifications" ||
      pathname === "/settings",
  },

  // Investors are funding actors and read-first community members: they can
  // read the funding surface, the community feed, meetups, the company
  // directory, profiles and their own settings. Everything else — the founder
  // dashboard, the co-founder directory, connections/DMs, B2B actions — is
  // founder-only, and so is every WRITE (posting, RSVPing, proposing), which is
  // enforced separately inside the individual server actions.
  //
  // Carried over VERBATIM from lib/investor-routes.ts. It is correct and it is
  // live for real accounts: do not "tidy" it toward the explorer list.
  investor: {
    home: INVESTOR_HOME,
    canRead: (pathname) =>
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
      // The company directory and company profiles, but not the
      // founder-to-founder B2B actions (create / propose / chat).
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
      pathname === "/settings",
  },
};

/**
 * Where to bounce a blocked member of this role, or null if the role is
 * ungated. A non-null home is also the signal that the role IS gated.
 */
export function roleHome(role: AccountRole): string | null {
  return ROLE_ACCESS[role].home;
}

/**
 * Whether this account still owes the founder onboarding form: the ungated
 * role (founder) with `onboarded` false. The same test app/(app)/layout.tsx
 * gates every app route on, written once more here for the sign-in paths that
 * can land OUTSIDE that layout — /products and the deck's review prompt above
 * all — so a new founder meets onboarding before anything else there too.
 * A gated role never owes it, exactly as in that layout: an explorer never
 * onboards, and the layout does not send an investor there either.
 */
export function owesOnboarding(role: AccountRole, onboarded: boolean): boolean {
  return roleHome(role) === null && !onboarded;
}

/** Whether this role may read this path. Always true for founder. */
export function canRoleRead(role: AccountRole, pathname: string): boolean {
  return ROLE_ACCESS[role].canRead(pathname);
}

/**
 * Route prefixes that live inside the (app) shell. Used by the middleware to
 * skip the account_type lookup entirely for marketing, auth and asset requests,
 * so the extra query only happens where the answer can change anything.
 *
 * THIS LIST MUST COVER EVERY page.tsx under app/(app). A route missing from it
 * pays NO role check in middleware at all — the silent-hole class this whole
 * module exists to prevent: the layout still bounces a hard load, but a soft
 * navigation sails straight through. "/activity" and "/notifications" were
 * exactly that — /activity is the founder "Profile insights" page and was
 * reachable by soft navigation for every gated role.
 *
 * Deliberately ABSENT: /insights lives at app/(marketing)/insights, not in the
 * (app) group. Adding it here would newly GATE a marketing route that every
 * signed-in role (and every anonymous visitor) is meant to read. /onboarding is
 * outside the (app) group too, which is why its explorer refusal has to be
 * written into the page and the action themselves.
 *
 * ALSO ABSENT, AND IT USED TO BE HERE: /products. The maker shelf moved to
 * app/(marketing)/products when it went public, so by the rule above — this
 * list covers every page.tsx under app/(app) — the entry became wrong, not
 * merely redundant. Removing it is what makes the shelf public for SIGNED-IN
 * roles too: proxy.ts's gate is `isAppShellRoute(path) && !everyRoleMayRead(path)`,
 * and everyRoleMayRead("/products") is FALSE because ROLE_ACCESS.investor does
 * not list it — so while the entry stayed, an investor asking for the newly
 * public shelf was still bounced to /funding, and a founder and an explorer
 * still paid an account_type SELECT in middleware on a page whose answer can no
 * longer change. Dropping it short-circuits that test on the FIRST clause.
 *
 * AND BACK, FOR ONE PAGE: ADD_PRODUCT_PATH. /products/new is a page.tsx under
 * app/(app) (app/(app)/products/new), so by the same rule it is listed — as
 * itself, never as "/products", which would re-gate the public shelf. It is
 * what makes proxy.ts look up the role there and bounce an investor to
 * /funding on a soft navigation too.
 */
export function isAppShellRoute(pathname: string): boolean {
  return [
    "/activity",
    "/admin",
    "/browse",
    "/community",
    "/companies",
    "/dashboard",
    "/funding",
    "/interests",
    "/investor",
    "/matches",
    "/meetups",
    "/messages",
    "/notifications",
    "/orgs",
    ADD_PRODUCT_PATH,
    "/profile",
    "/settings",
  ].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

// ---------------------------------------------------------------------------
// THE WRITE LADDER
// ---------------------------------------------------------------------------
// ONE table, transcribed row-for-row from the decided spec, so no call site
// ever re-derives a capability from a string comparison. Read a column down to
// audit one capability; read a row across to audit one role.
//
//           | thread | comment | like | rate | rsvp | host | interest | product | orgs
//  founder  |  yes   |   yes   | yes  | yes  | yes  | yes  |   yes    |   yes   | yes
//  explorer |  NO    |   YES   | YES  | YES  | YES  |  NO  |    NO    |   NO    |  NO
//  investor |  no    |   no    | yes  | yes  |  no  |  no  |    no    |   no    |  no
//
// Three rows are load-bearing and get destroyed by a careless sweep:
//
//  * explorer CAN comment and CAN RSVP. Those two cells ARE the role. A pass
//    that "fixes" commenting to match posting deletes the reason explorer
//    exists. Anyone narrowing `comment` or `rsvpMeetup` is removing a feature,
//    not closing a hole.
//  * every role CAN like. The absence of a gate on the like actions is
//    deliberate; do not add one.
//  * every role CAN rate a product, the same answer as `like`, and for the
//    same reason: it is a reaction to something someone made, not a thing the
//    rater starts. (CLAUDE.md, "Founder decision (2026-11-10)".) What limits a
//    rating is not the ROLE but the PRODUCT — never your own, never a hidden
//    post, products only — and that is checked per product, in
//    setProductRatingAction and in migration 0079's RLS. Unlike `like`, the
//    rating action DOES call canRate: a fourth role is then refused unless
//    someone decides otherwise here. 0079 has no role clause because no role
//    is refused today; a role that may not rate needs one there too.
//
// Note what RSVP drags along: meetup code has used "is going" as a proxy for
// "is a trusted founder". Now that an explorer can be going, that proxy is
// dead — inviting and enumerating founders are founder-only
// (canHostMeetup/canWriteOrgs territory), not consequences of an RSVP.

type Capability =
  | "postThread"
  | "comment"
  | "like"
  | "rate"
  | "rsvpMeetup"
  | "hostMeetup"
  | "expressInterest"
  | "postProduct"
  | "writeOrgs";

const ROLE_CAPABILITIES: Record<AccountRole, Record<Capability, boolean>> = {
  founder: {
    postThread: true,
    comment: true,
    like: true,
    rate: true,
    rsvpMeetup: true,
    hostMeetup: true,
    expressInterest: true,
    postProduct: true,
    writeOrgs: true,
  },
  explorer: {
    postThread: false,
    comment: true,
    like: true,
    rate: true,
    rsvpMeetup: true,
    hostMeetup: false,
    expressInterest: false,
    postProduct: false,
    writeOrgs: false,
  },
  investor: {
    postThread: false,
    comment: false,
    like: true,
    rate: true,
    rsvpMeetup: false,
    hostMeetup: false,
    expressInterest: false,
    postProduct: false,
    writeOrgs: false,
  },
};

/** Start a top-level thread in the community. Founder only. */
export function canPostThread(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].postThread;
}

/**
 * Comment on a thread or a product. Founder AND EXPLORER — feedback is the
 * whole point of the explorer role. Investors stay read-only.
 */
export function canComment(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].comment;
}

/** Like a post or comment. Every role. There is no gate to add here. */
export function canLike(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].like;
}

/**
 * Give a product 1–5 stars. Every role — the same answer as canLike. This is
 * the ROLE half only: never your own product, never a hidden post, products
 * only, and those are checked per product by setProductRatingAction (and by
 * migration 0079's RLS). Ratings are never of a person, a founder or a company.
 */
export function canRate(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].rate;
}

/**
 * RSVP to a meetup, or accept an invite to one (accepting IS an RSVP for
 * ladder purposes — it is the one path that writes a "going" row without the
 * host acting). Founder AND EXPLORER: turning up to try things is exactly the
 * behaviour the role exists for.
 */
export function canRsvpMeetup(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].rsvpMeetup;
}

/**
 * Host a meetup — and, by the same standing, invite founders to one or
 * enumerate the founder directory to do so. Founder only.
 */
export function canHostMeetup(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].hostMeetup;
}

/**
 * Open co-founder interest. Founder only, and it must hold on BOTH sides: a
 * reciprocal interest trips a DB trigger that mints a `matches` row, which is
 * the only door into /messages. Gate this and the whole messages surface
 * inherits the guarantee.
 */
export function canExpressInterest(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].expressInterest;
}

/**
 * Post a product to the maker shelf. Founder only — a product is a forum_posts
 * row with kind "show_and_tell", so this and canPostThread guard the same
 * table and must not drift. Keeping explorers off the shelf is what keeps it
 * maker-signal. Checked by createProductAction (lib/post-actions.ts), the one
 * writer of that kind, and by the page it serves, ADD_PRODUCT_PATH.
 */
export function canPostProduct(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].postProduct;
}

/**
 * Any organizations / B2B write: create or join an org, invite or re-rank
 * members, request or answer a connection, chat as the company, propose a
 * deal. Founder only. Org membership is NOT a substitute for this check —
 * standing inside an org and the role of the account holding it are two
 * different questions.
 */
export function canWriteOrgs(role: AccountRole): boolean {
  return ROLE_CAPABILITIES[role].writeOrgs;
}

// ---------------------------------------------------------------------------
// Invariant: a gated role's home must be LISTED as readable by that role
// ---------------------------------------------------------------------------
// It holds two things at once, and since /products went public only one of them
// is about today's behaviour:
//
//   1. While the home is inside the (app) shell, an unreadable home is an
//      infinite redirect: the gate bounces the role to its home, and the home
//      bounces it again. ERR_TOO_MANY_REDIRECTS on the one page that role can
//      reach. That is INVESTOR_HOME today ("/funding" is in isAppShellRoute),
//      and it is the loop this check was written for — the investor gate had
//      only avoided it by coincidence, because "/funding" happened to sit in
//      the investor allowlist and nothing said so.
//
//   2. Once the home is PUBLIC the gate never evaluates it, so the listing
//      cannot be load-bearing — and that is precisely what invites someone to
//      delete it as dead. It is a FORWARD GUARD: moving that home back into the
//      (app) shell must not silently block the one page the role is sent to.
//      That is EXPLORER_HOME today ("/products" is a marketing route).
//
// Both collapse to the same `!canRead(home)` test, so this stays ONE `if` — the
// thing that changed is what it means, which is why the message names both.
// Keep the /products entries in ROLE_ACCESS.explorer.canRead: deleting them as
// dead code makes this throw at MODULE LOAD, and lib/roles.ts is imported by
// proxy.ts and app/(app)/layout.tsx, so every request on every route — the
// public shelf included — would 500.
//
// A static check over constants, so it fails at build time (every page that
// renders the app layout imports this module) rather than in production.
for (const role of ACCOUNT_ROLES) {
  const home = ROLE_ACCESS[role].home;
  if (home !== null && !ROLE_ACCESS[role].canRead(home)) {
    throw new Error(
      `lib/roles.ts: ROLE_ACCESS.${role}.home ("${home}") is not readable by ` +
        `"${role}". If it is inside the (app) shell the route gate would ` +
        `redirect it to itself forever; if it is a public route today, the ` +
        `listing is the forward guard that keeps moving it back into the shell ` +
        `from silently blocking the one page "${role}" is sent to. Either way ` +
        `the entry belongs in ROLE_ACCESS.${role}.canRead.`,
    );
  }
}
