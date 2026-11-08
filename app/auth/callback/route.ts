import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storeTokens } from "@/lib/google-calendar";
import { FEATURES } from "@/lib/features";
import { parseAccountRole, canRoleRead, roleHome } from "@/lib/roles";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
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
  // WHY THE DESTINATION CANNOT JUST BE `next`: it defaults to /dashboard, which
  // a gated role is not allowed to read. An explorer sent there is bounced by
  // the middleware to their own home — so without this they pay an extra
  // redirect through a founder-only route on the first screen they ever see,
  // and analytics records them as having "visited the dashboard".
  const userId = data.session?.user?.id ?? data.user?.id ?? null;
  let destination = next;
  if (userId) {
    const role = await applyPickedRole(supabase, userId, pickedRole);
    const home = roleHome(role);
    if (home && !canRoleRead(role, destination)) destination = home;
  }

  return NextResponse.redirect(`${publicOrigin}${destination}`);
}

/**
 * Resolve this account's role, applying `?role=` if — and only if — the profile
 * has not recorded an explicit choice yet. Returns the role in force afterwards.
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
) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("account_type, role_chosen, onboarded")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[auth/callback] role lookup failed", error);
    return parseAccountRole(null);
  }

  const current = parseAccountRole(profile?.account_type);
  if (!pickedRole || profile?.role_chosen !== false) return current;

  const requested = parseAccountRole(pickedRole);
  if (requested === "investor" && !FEATURES.investorSignup) return current;
  if (requested === current) {
    // Nothing to change, but still close the latch so a later ?role= cannot
    // reopen the question.
    await closeLatch(supabase, userId);
    return current;
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
    return current;
  }
  return updated?.length ? requested : current;
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
