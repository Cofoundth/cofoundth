"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { FEATURES } from "@/lib/features";
import { parseAccountRole, DEFAULT_ROLE, EXPLORER_HOME } from "@/lib/roles";

// Resolve the origin of the CURRENT request, so confirmation / password-reset
// links (and any OAuth redirectTo built server-side) land back on whatever host
// the user is actually on — production, a staging preview, or localhost —
// instead of a hardcoded prod URL. Vercel sets `x-forwarded-host` to the real
// public host; the /auth/callback route trusts the same header for its
// post-OAuth redirect. Falls back to NEXT_PUBLIC_SITE_URL, then prod.
async function getRequestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
    const proto = h.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");
    return `${proto}://${host}`;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";
}

// ------------------------------------------------------------------
// SIGN UP — link-only flow.
// User submits credentials → Supabase sends a confirmation LINK to email
// → user clicks → /auth/callback exchanges code → user lands on /dashboard.
// No 6-digit OTP step. (See email template "Confirm signup" — uses
// {{ .ConfirmationURL }}.)
// ------------------------------------------------------------------

export type SignupState =
  | { step: "credentials"; error?: string }
  | { step: "check_email"; email: string };

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const supabase = await createClient();
  const origin = await getRequestOrigin();

  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const fullName = `${firstName} ${lastName}`.trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  // Registration persona, validated against the ONE allowlist in lib/roles.ts
  // rather than a literal. The old `=== "investor" ? ... : "founder"` ternary
  // could not express a third value at all: a form posting
  // account_type=explorer silently created a founder, in the same way
  // handle_new_user's own binary did.
  //
  // 'investor' is refused while FEATURES.investorSignup is false. It falls back
  // to the default role rather than erroring because the picker cannot offer
  // the option at all — only a hand-crafted POST reaches this line, and
  // parseAccountRole's documented posture for anything it will not honour is
  // the unrestricted default. NOTE: 'admin' is never an account_type.
  const requestedRole = parseAccountRole(formData.get("account_type"));
  const accountType =
    requestedRole === "investor" && !FEATURES.investorSignup
      ? DEFAULT_ROLE
      : requestedRole;
  // account_type is the binding role for this account — chosen here at signup.
  // It is NOT changeable in-app, with exactly ONE exception: the one-way
  // explorer -> founder upgrade, which exists because it is the funnel (try
  // what people built, get inspired, build something). founder -> explorer,
  // anything -> investor and investor -> anything are all refused. Do not read
  // that single edge as permission to add a general role switcher.
  //
  // Where to land afterwards follows the role. /onboarding is right for a
  // founder AND for an investor — both have a form there, and
  // OnboardingRoleSwitch picks between them. The EXPLORER is the one that
  // skips onboarding by definition, so sending them there would be a dead end:
  // the page and the action both refuse them. Written as an explicit explorer
  // case rather than `roleHome(accountType) ?? "/onboarding"`, which would have
  // quietly routed a new investor to /funding and skipped their form.
  const next = accountType === "explorer" ? EXPLORER_HOME : "/onboarding";

  if (!firstName || !email || !password) {
    return { step: "credentials", error: "All fields are required." };
  }
  const passwordError = validatePassword(password);
  if (passwordError) return { step: "credentials", error: passwordError };
  if (password !== confirmPassword) {
    return { step: "credentials", error: "Passwords don't match." };
  }

  // Pre-check via service role: did this email already register?
  // Avoids Supabase's enumeration-protection ambiguity that would otherwise
  // strand users who signed up but never clicked the confirmation link.
  const existing = await findUserByEmail(email);

  if (existing) {
    if (existing.email_confirmed_at) {
      return {
        step: "credentials",
        error:
          "This email is already registered. Sign in instead, or use forgot password.",
      };
    }
    // Unconfirmed: silently resend the confirmation link and show check-email.
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback?next=${next}`,
      },
    });
    if (resendError) {
      return { step: "credentials", error: resendError.message };
    }
    return { step: "check_email", email };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        first_name: firstName,
        last_name: lastName,
        account_type: accountType,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${next}`,
    },
  });

  if (error) return { step: "credentials", error: error.message };

  // If email confirmation is OFF in Supabase, signUp returns a session
  // immediately — skip the check-email step.
  //
  // Lands on `next`, not /dashboard. /dashboard was never where a brand-new
  // account belonged (the app layout immediately redirected a founder on to
  // /onboarding, so this was a wasted hop), and for an explorer it is a route
  // they cannot read — they would be bounced twice before seeing anything.
  if (data.session) redirect(next);

  return { step: "check_email", email };
}

// Password validation rules — kept in sync with client-side checks in
// SignupForm so the user gets immediate feedback AND the server still
// enforces (defense in depth).
function validatePassword(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters.";
  if (pw.length > 72) return "Password is too long (max 72 characters).";
  if (!/[a-zA-Z]/.test(pw)) return "Password must include a letter.";
  if (!/[0-9]/.test(pw)) return "Password must include a number.";
  return null;
}

// Server-only: looks up a user by email via the admin API (bypasses
// enumeration protection). Returns null if not found.
//
// Implementation: `profiles.email` is synced from `auth.users` (migration 0005)
// and indexed, so we look up the user id from there first (O(1)) and then
// fetch the confirmed-at flag from auth.users by id (O(1)). Avoids the
// page-1-of-listUsers trap that strands users once the table exceeds 1000.
async function findUserByEmail(
  email: string,
): Promise<{ email_confirmed_at: string | null } | null> {
  const admin = createAdminClient();
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (profileError) {
    console.error("[signup.findUserByEmail] profile lookup failed", profileError);
    return null;
  }
  if (!profile) return null;

  const { data, error } = await admin.auth.admin.getUserById(profile.id);
  if (error || !data?.user) {
    console.error("[signup.findUserByEmail] auth lookup failed", error);
    return null;
  }
  return { email_confirmed_at: data.user.email_confirmed_at ?? null };
}

// ------------------------------------------------------------------
// SIGN IN — email + password
// ------------------------------------------------------------------

export type SignInState = { error?: string } | null;

export async function signInAction(
  _prev: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    // Friendlier messages for common cases
    const lower = error.message.toLowerCase();
    if (lower.includes("invalid login credentials")) {
      return { error: "Wrong email or password." };
    }
    if (lower.includes("email not confirmed")) {
      return { error: "Please verify your email before signing in." };
    }
    return { error: error.message };
  }

  redirect("/dashboard");
}

// ------------------------------------------------------------------
// FORGOT PASSWORD — step 1: send recovery email, step 2: verify + set new
// ------------------------------------------------------------------

export type ResetState =
  | { step: "email"; error?: string }
  | { step: "verify"; email: string; error?: string };

export async function resetPasswordAction(
  prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const supabase = await createClient();
  const origin = await getRequestOrigin();

  if (prev.step === "email") {
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();

    if (!email) return { step: "email", error: "Please enter your email." };

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${origin}/auth/callback?next=/dashboard`,
    });

    if (error) return { step: "email", error: error.message };
    return { step: "verify", email };
  }

  // step === "verify" — verify OTP and set new password
  const token = String(formData.get("code") ?? "").trim();
  const newPassword = String(formData.get("password") ?? "");

  if (!/^\d{6}$/.test(token)) {
    return {
      step: "verify",
      email: prev.email,
      error: "Enter the 6-digit code from your email.",
    };
  }
  if (newPassword.length < 8) {
    return {
      step: "verify",
      email: prev.email,
      error: "Password must be at least 8 characters.",
    };
  }

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email: prev.email,
    token,
    type: "recovery",
  });
  if (verifyError) {
    return { step: "verify", email: prev.email, error: verifyError.message };
  }

  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });
  if (updateError) {
    return { step: "verify", email: prev.email, error: updateError.message };
  }

  redirect("/dashboard");
}

// ------------------------------------------------------------------
// SIGN OUT
// ------------------------------------------------------------------

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
