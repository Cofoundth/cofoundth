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

  // If user authenticated via Google with Calendar scope, persist provider tokens
  // so server actions can call Calendar API on their behalf later.
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
      await storeTokens({
        userId,
        accessToken: providerToken,
        refreshToken: providerRefreshToken ?? null,
        expiresIn: 3600,
        scope:
          "openid email profile https://www.googleapis.com/auth/calendar.events",
      });
    }
  } catch (e) {
    console.error("[auth/callback] token storage failed", e);
  }

  return NextResponse.redirect(`${publicOrigin}${next}`);
}
