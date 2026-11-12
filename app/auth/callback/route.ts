import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storeTokens } from "@/lib/google-calendar";
import { FEATURES } from "@/lib/features";
import {
  parseAccountRole,
  canRoleRead,
  isAppShellRoute,
  landingFor,
  owesOnboarding,
  roleHome,
  type AccountRole,
} from "@/lib/roles";
import { SIGN_IN_LANDING, throughOnboarding } from "@/lib/auth-href";
import { safeNextPath } from "@/lib/safe-next";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // Where to land: a sign-in or sign-up link from a product page or the deck
  // carries `next=` (lib/auth-href.ts) — /p/<id>, or the deck's
  // /products?…&review=<id> — through Google/LinkedIn's redirectTo and through
  // the email-confirmation link, and arrives here. Attacker-controlled like
  // any query value, so it is followed only if lib/safe-next.ts says it is a
  // same-origin path; anything else lands on the role's landing (below).
  const requested = safeNextPath(searchParams.get("next"));
  // The role the visitor picked on the signup page, carried across the OAuth
  // round trip by GoogleSignInButton / LinkedInSignInButton. Absent on /login,
  // on the email-confirmation link (that path puts the role in
  // raw_user_meta_data, so handle_new_user has already stored it) and on
  // password recovery. Applied at most once — see applyPickedRole below.
  const pickedRole = searchParams.get("role");

  // Build the public redirect URL — Vercel/Cloudflare proxies forward the
  // original host in `x-forwarded-host`; `request.url`'s origin can be an
  // internal hostname which would land users on the wrong domain after the
  // session cookie was set for the public domain.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  const publicOrigin =
    isLocalEnv || !forwardedHost ? origin : `https://${forwardedHost}`;

  if (!code) {
    return NextResponse.redirect(
      `${publicOrigin}/login?error=auth_callback_failed`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${publicOrigin}/login?error=auth_callback_failed`,
    );
  }

  // If user authenticated via Google, verify the token's actual scope + TTL
  // via Google's tokeninfo endpoint before persisting. The OAuth exchange
  // doesn't expose expires_in or scope to Supabase, so we MUST introspect —
  // otherwise we'd be lying about both (asserting calendar.events scope and
  // a 1-hour TTL regardless of what the user actually granted).
  try {
    const session = data.session;
    const providerToken = session?.provider_token;
    const providerRefreshToken = session?.provider_refresh_token;
    const userId = session?.user?.id;
    const userProvider = session?.user?.app_metadata?.provider;

    if (
      userId &&
      providerToken &&
      userProvider === "google" &&
      process.env.SUPABASE_SECRET_KEY
    ) {
      const info = await fetchGoogleTokenInfo(providerToken);
      if (info) {
        await storeTokens({
          userId,
          accessToken: providerToken,
          refreshToken: providerRefreshToken ?? null,
          expiresIn: info.expires_in,
          scope: info.scope,
        });
      }
    }
  } catch (e) {
    console.error("[auth/callback] token storage failed", e);
  }

  // Record the picked role (OAuth signups only, once) and then route by role.
  //
  // WITH NO `next`, the destination is the role's landing (lib/roles.ts
  // landingFor): the product deck for a founder or an explorer, an investor's
  // own home. There is no dashboard any more (2026-11-12).
  //
  // WITH A `next` it is followed unless it is an (app) shell route this role
  // may not read — the GATE'S OWN test (proxy.ts), so a gated role is sent to
  // its home instead of bouncing through a route it cannot open. Only shell
  // routes: the role allowlists list app routes, not /p/<id>, so an explorer
  // signing in from a product page goes back to that product. canRoleRead
  // takes a pathname, so the query is cut off first.
  //
  // A FOUNDER WHO HAS NOT ONBOARDED is sent through /onboarding, carrying the
  // destination as its `next`. app/(app)/layout.tsx does that for every app
  // route, but `next` is not always an app route: the deck's sign-in prompt
  // sends /products?…&review=<id>, a marketing page with no gates, where a
  // brand-new Google sign-up would otherwise land straight in the review
  // modal and skip onboarding entirely. The email/password sign-up already
  // arrives wrapped (signupAction), and throughOnboarding leaves that alone.
  // `onboarded` is null when the profile could not be read; that sends no one
  // through onboarding on a guess, and the app layout still gates app routes.
  const userId = data.session?.user?.id ?? data.user?.id ?? null;
  let destination = requested ?? SIGN_IN_LANDING;
  if (userId) {
    const { role, onboarded } = await applyPickedRole(
      supabase,
      userId,
      pickedRole,
    );
    destination = requested ?? landingFor(role);
    const home = roleHome(role);
    const path = destination.split(/[?#]/, 1)[0];
    if (home && isAppShellRoute(path) && !canRoleRead(role, path)) {
      destination = home;
    } else if (onboarded !== null && owesOnboarding(role, onboarded)) {
      destination = throughOnboarding(destination);
    }
  }

  return NextResponse.redirect(`${publicOrigin}${destination}`);
}

/**
 * Resolve this account's role, applying `?role=` if — and only if — the profile
 * has not recorded an explicit choice yet. Returns the role in force afterwards,
 * and the profile's `onboarded` (null if the profile could not be read). The
 * role write below never changes `onboarded`: it only matches a row whose
 * `onboarded` is false.
 *
 * IDEMPOTENT BY DESIGN. `profiles.role_chosen` (migration 0077) is the latch:
 * handle_new_user sets it true when signup metadata carried a recognised
 * account_type (the email/password path), and false otherwise — which is
 * exactly the OAuth case, where the provider round trip loses everything not in
 * redirectTo. So the first callback after an OAuth signup gets one chance to
 * write the role, and every later sign-in is a no-op: the guard is re-stated as
 * `.eq("role_chosen", false)` ON THE UPDATE, not just checked in the read, so
 * two concurrent callbacks cannot both apply it.
 *
 * Tampering with the query string is irrelevant — the role is self-selected on
 * the signup page anyway — but the value is still validated against the one
 * allowlist in lib/roles.ts before it is written, and 'investor' is refused
 * while FEATURES.investorSignup is false. A hand-crafted ?role=investor must
 * not mint an investor account while the option is hidden.
 *
 * This runs under the CALLER'S OWN session (createClient, not the service
 * role), so RLS applies: profiles_update_own scopes it to `auth.uid() = id`,
 * which is the only row touched. profiles.role_chosen is SELECT-granted to
 * `authenticated` by 0077 — without that grant the read would error rather
 * than return false, which would silently disable the whole role carry.
 */
async function applyPickedRole(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  pickedRole: string | null,
): Promise<{ role: AccountRole; onboarded: boolean | null }> {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("account_type, role_chosen, onboarded")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[auth/callback] role lookup failed", error);
    return { role: parseAccountRole(null), onboarded: null };
  }

  const onboarded = profile ? profile.onboarded === true : null;
  const current = parseAccountRole(profile?.account_type);
  if (!pickedRole || profile?.role_chosen !== false) {
    return { role: current, onboarded };
  }

  const requested = parseAccountRole(pickedRole);
  if (requested === "investor" && !FEATURES.investorSignup) {
    return { role: current, onboarded };
  }
  if (requested === current) {
    // Nothing to change, but still close the latch so a later ?role= cannot
    // reopen the question.
    await closeLatch(supabase, userId);
    return { role: current, onboarded };
  }

  // `onboarded` false as well as `role_chosen` false. The latch alone would let
  // somebody who had already finished FOUNDER onboarding sign out, return to
  // /signup, pick "try things" and demote their own filled-in profile out of
  // the directory. Every account this carry actually exists for — a fresh OAuth
  // signup, and any explorer — has onboarded = false, so nothing legitimate is
  // lost by requiring it.
  //
  // `.select()` is not decoration: all three `.eq()`s are part of the WHERE
  // clause, so a row that no longer qualifies (the latch closed, or onboarding
  // finished, between the read above and this write) matches NOTHING and
  // returns NO error. Without reading back what was updated this would report a
  // role it never applied, and the redirect below would be computed from it.
  const { data: updated, error: updateError } = await supabase
    .from("profiles")
    .update({ account_type: requested, role_chosen: true })
    .eq("id", userId)
    .eq("role_chosen", false)
    .eq("onboarded", false)
    .select("account_type");
  if (updateError) {
    console.error("[auth/callback] role apply failed", updateError);
    return { role: current, onboarded };
  }
  return { role: updated?.length ? requested : current, onboarded };
}

/** Mark the role as explicitly chosen without changing it. */
async function closeLatch(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
) {
  const { error } = await supabase
    .from("profiles")
    .update({ role_chosen: true })
    .eq("id", userId)
    .eq("role_chosen", false);
  if (error) console.error("[auth/callback] role latch failed", error);
}

async function fetchGoogleTokenInfo(
  accessToken: string,
): Promise<{ expires_in: number; scope: string } | null> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      expires_in?: string | number;
      scope?: string;
    };
    const expires_in = Number(json.expires_in ?? 0);
    if (!expires_in || !json.scope) return null;
    // Cap stored TTL at the real value minus 60s headroom so refresh fires
    // before Google considers the token expired.
    return {
      expires_in: Math.max(60, expires_in - 60),
      scope: json.scope,
    };
  } catch (e) {
    console.error("[auth/callback] tokeninfo lookup failed", e);
    return null;
  }
}
