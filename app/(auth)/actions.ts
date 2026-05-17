"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ------------------------------------------------------------------
// SIGN UP — step 1: create user + send OTP, step 2: verify OTP
// ------------------------------------------------------------------

export type SignupState =
  | { step: "credentials"; error?: string }
  | { step: "verify"; email: string; error?: string };

export async function signupAction(
  prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const supabase = await createClient();
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  if (prev.step === "credentials") {
    const fullName = String(formData.get("fullName") ?? "").trim();
    const email = String(formData.get("email") ?? "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") ?? "");

    if (!fullName || !email || !password) {
      return { step: "credentials", error: "All fields are required." };
    }
    if (password.length < 8) {
      return {
        step: "credentials",
        error: "Password must be at least 8 characters.",
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) return { step: "credentials", error: error.message };

    // If email confirmation is OFF in Supabase, signUp returns a session
    // immediately — skip the OTP step.
    if (data.session) redirect("/dashboard");

    return { step: "verify", email };
  }

  // step === "verify" — confirm the email with the OTP code
  const token = String(formData.get("code") ?? "").trim();

  if (!/^\d{6}$/.test(token)) {
    return {
      step: "verify",
      email: prev.email,
      error: "Enter the 6-digit code from your email.",
    };
  }

  const { error } = await supabase.auth.verifyOtp({
    email: prev.email,
    token,
    type: "signup",
  });

  if (error) {
    return { step: "verify", email: prev.email, error: error.message };
  }

  redirect("/dashboard");
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
  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

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
  redirect("/login");
}
