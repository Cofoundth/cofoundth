import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import {
  ACCOUNT_ROLES,
  canRoleRead,
  isAppShellRoute,
  landingFor,
  owesOnboarding,
  parseAccountRole,
  roleHome,
  type AccountRole,
} from "@/lib/roles";
import { PARAM } from "@/app/(marketing)/products/categories";

// Ship the CSP in report-only mode first to verify the policy + nonce
// propagation against real prod without risking a blank app, then flip to
// enforcing once the console is clean.
const CSP_REPORT_ONLY = false;

// Build a strict, nonce-based Content-Security-Policy. This is the defense that
// actually stops XSS (the precondition for token theft etc.) rather than just
// limiting its blast radius.
function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseWs = supabaseUrl.replace(/^https:/, "wss:");
  const dev = process.env.NODE_ENV !== "production";
  return [
    `default-src 'self'`,
    // Next's bootstrap <script> gets the nonce; 'strict-dynamic' lets it load
    // the rest of the chunks. 'unsafe-eval' only in dev (HMR / react-refresh).
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Tailwind + Next inject inline style attributes that can't carry a nonce.
    // Style injection isn't a script-execution vector, so 'unsafe-inline' is OK.
    `style-src 'self' 'unsafe-inline'`,
    // Avatars / post images come from Supabase Storage, Google, LinkedIn, etc.
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    // Server actions post to 'self'; the browser Supabase client (OAuth) talks
    // to the project's REST + realtime endpoints.
    `connect-src 'self' ${supabaseUrl} ${supabaseWs}`,
    `frame-src 'self'`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ]
    .filter(Boolean)
    .join("; ");
}

// A pre-filter for the role gate below, and ROLE-INDEPENDENT on purpose: if
// EVERY role may read the path then no role can be bounced off it, so the
// account_type lookup cannot change the outcome and is skipped. Computed from
// the allowlists themselves (two pure string predicates, no I/O), so it cannot
// drift away from them.
//
// It replaces `!isInvestorReadableRoute(path)`, which was ONE role's allowlist
// used as the filter for every role. That worked only while "investor" was the
// only gated role. The two gated allowlists disagree in BOTH directions —
// /funding, /investor and /orgs are investor-readable and explorer-blocked,
// while /community and /meetups are readable by both on different terms — so
// keeping it would have skipped the lookup on exactly the paths the explorer
// gate is needed for, and an explorer would have walked into /funding,
// /investor and /orgs unchecked.
//
// The sharpest example of that disagreement used to be /products, which was the
// explorer's home AND investor-blocked. It is a PUBLIC marketing route now and
// has left isAppShellRoute, so the gate below short-circuits on its FIRST
// clause and this function is never asked about it. That is the point: an
// investor reads the public shelf like anyone else, and no signed-in visitor
// pays an account_type SELECT for a page whose answer can no longer change.
function everyRoleMayRead(path: string): boolean {
  return ACCOUNT_ROLES.every((role) => canRoleRead(role, path));
}

export async function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = buildCsp(nonce);

  // Next reads the nonce from the request's CSP header and applies it to its
  // own scripts; x-nonce lets RSC read it via headers() if ever needed.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);
  // Expose the path to RSC (the app layout uses it for role-based routing).
  requestHeaders.set("x-pathname", request.nextUrl.pathname);

  let response: NextResponse;
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  ) {
    response = NextResponse.next({ request: { headers: requestHeaders } });
  } else {
    const session = await updateSession(request, requestHeaders);
    response = session.response;

    const path = request.nextUrl.pathname;

    // One builder for every bounce out of this middleware, so the two
    // properties such a redirect MUST carry cannot be forgotten by a third
    // caller: the refreshed auth cookies, and the CSP header.
    const bounce = (to: string, search = "") => {
      const url = request.nextUrl.clone();
      url.pathname = to;
      url.search = search;
      const redirect = NextResponse.redirect(url);
      // Carry the refreshed auth cookies onto the redirect, or the bounce
      // silently signs the user out.
      response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
      // Set the CSP on the redirect too, exactly as the pass-through response
      // at the bottom of this function does.
      redirect.headers.set(
        CSP_REPORT_ONLY
          ? "content-security-policy-report-only"
          : "content-security-policy",
        csp,
      );
      return redirect;
    };

    // The one place this middleware learns who it is talking to: a lookup by
    // primary key, on a request that has already called auth.getUser(). Both
    // callers below are gated on session.user first, so marketing, auth and
    // asset requests pay nothing for it.
    const readRole = async (userId: string): Promise<AccountRole> => {
      const { data } = await session.supabase
        .from("profiles")
        .select("account_type")
        .eq("id", userId)
        .maybeSingle();
      return parseAccountRole(data?.account_type);
    };

    // Where a signed-in member asking for "/" (or the retired /dashboard) is
    // sent: their role's landing — the product deck for a founder or an
    // explorer, an investor's own home — or /onboarding first for a founder who
    // still owes it, because the deck is a public page that
    // app/(app)/layout.tsx's onboarding gate never sees. An unreadable profile
    // sends no one to onboarding on a guess (the app layout still gates app
    // routes), and its role falls open to founder.
    const landingOf = async (userId: string): Promise<string> => {
      const { data } = await session.supabase
        .from("profiles")
        .select("account_type, onboarded")
        .eq("id", userId)
        .maybeSingle();
      const role = parseAccountRole(data?.account_type);
      return data && owesOnboarding(role, !!data.onboarded)
        ? "/onboarding"
        : landingFor(role);
    };

    // ---- Signed-in visitors don't need the front door --------------------
    // "/" is the logged-out front door, whichever arm it is on (the maker shelf,
    // or the pitch until the shelf can carry it). Someone who is already a member
    // asking for it is sent to their LANDING (landingOf above): the product deck
    // at its own address, /products, where the rail marks it, for a founder or
    // an explorer; an investor's own home; /onboarding first for a founder who
    // owes it. Anonymous requests fall straight through — the check is gated on
    // session.user, so the people the page is written for pay nothing here.
    //
    // THE ONE EXCEPTION: a shared /?category=game is a link to a filtered shelf,
    // so a member follows it to the shelf, query intact, whatever their role. It
    // is checked before the lookup because the answer does not depend on it.
    //
    // /dashboard IS RETIRED (2026-11-12) — the deck is the first page a member
    // sees. The path still arrives from old links, bookmarks and emails, so it
    // is answered here, before any gate: a member goes where "/" sends them, and
    // a signed-out visitor to sign in, which then lands them the same way.
    if (path === "/dashboard" && !session.user) return bounce("/login");
    if (session.user && (path === "/" || path === "/dashboard")) {
      if (path === "/" && request.nextUrl.searchParams.has(PARAM)) {
        return bounce("/products", request.nextUrl.search);
      }
      return bounce(await landingOf(session.user.id));
    }

    // ---- Role route access -----------------------------------------------
    // This is the REAL gate, and it has to live here. app/(app)/layout.tsx also
    // checks, but Next does not re-render a shared layout on a client-side
    // navigation, so that redirect only fires on a full page load — an investor
    // clicking through was served the (since removed) founder dashboard. Verified
    // against the running app. Middleware runs on every request, including the
    // RSC fetches a soft navigation makes, so it is the only layer that sees
    // every navigation.
    //
    // Role-generic: lib/roles.ts owns each role's allowlist and each role's
    // home, and a null home means the role is ungated (founder). Adding a role
    // does not come back here.
    //
    // The account_type lookup is skipped entirely unless someone is signed in,
    // the path is inside the (app) shell, AND some role could actually be
    // bounced off it — see everyRoleMayRead above for why that last test must
    // not be one role's allowlist.
    if (session.user && isAppShellRoute(path) && !everyRoleMayRead(path)) {
      const role = await readRole(session.user.id);
      const home = roleHome(role);
      if (home !== null && !canRoleRead(role, path)) return bounce(home);
    }
  }

  response.headers.set(
    CSP_REPORT_ONLY
      ? "content-security-policy-report-only"
      : "content-security-policy",
    csp,
  );
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
