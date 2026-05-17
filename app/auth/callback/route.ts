import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { storeTokens } from "@/lib/google-calendar";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
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
        expiresIn: 3600, // Google access tokens default to 1h
        scope:
          "openid email profile https://www.googleapis.com/auth/calendar.events",
      });
    }
  } catch (e) {
    // Don't block sign-in if token storage fails.
    console.error("[auth/callback] token storage failed", e);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
