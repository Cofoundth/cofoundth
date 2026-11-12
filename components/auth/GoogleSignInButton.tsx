"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AccountRole } from "@/lib/roles";

type GoogleSignInButtonProps = {
  label?: string;
  /**
   * Where to land after the round trip — the product a sign-in started from,
   * when there is one. Carried in redirectTo like `role`, because the provider
   * drops everything else. This button is only the carrier: the callback
   * follows it only after lib/safe-next.ts accepts it.
   */
  next?: string;
  /**
   * The role the visitor picked in the signup form, carried through OAuth.
   *
   * WHY THIS PROP EXISTS: the provider round trip loses everything that is not
   * in `redirectTo`. Without it, handle_new_user sees no account_type in
   * raw_user_meta_data and defaults to founder — so picking a role and then
   * clicking Google silently made you a founder, permanently. With an explorer
   * role that is fatal rather than annoying: this button is the most prominent
   * control on the signup page, so the role would be unreachable for every
   * OAuth signup.
   *
   * Omitted on /login, where there is no role to pick — an existing account
   * already has one, and the callback only applies `?role=` to a profile whose
   * role_chosen is still false.
   *
   * Tampering is irrelevant (the role is self-selected anyway), but the value
   * is still validated server-side in app/auth/callback/route.ts, which is also
   * what refuses 'investor' while FEATURES.investorSignup is false. This button
   * is only the carrier; it does not decide.
   */
  role?: AccountRole;
};

export function GoogleSignInButton({
  label = "Continue with Google",
  next,
  role,
}: GoogleSignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  async function handleClick() {
    setIsLoading(true);
    const supabase = createClient();
    // No `next` when the sign-in did not start anywhere: the callback then
    // lands the member on their role's landing (the deck; there is no
    // dashboard any more).
    const params = new URLSearchParams();
    if (next) params.set("next", next);
    if (role) params.set("role", role);
    const query = params.toString();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback${query ? `?${query}` : ""}`,
      },
    });
    if (error) {
      console.error("Google OAuth error:", error);
      setIsLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isLoading}
      className="w-full px-8 py-4 border border-line bg-white hover:bg-cream disabled:opacity-60 text-ink text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-3"
    >
      <GoogleLogo />
      {isLoading ? "Redirecting…" : label}
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
