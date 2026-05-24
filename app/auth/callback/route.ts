import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storeTokens } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

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

  return NextResponse.redirect(`${publicOrigin}${next}`);
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
