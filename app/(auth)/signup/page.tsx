"use client";

import { useState } from "react";
import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
// LinkedIn login disabled for now — provider not enabled in Supabase + no LinkedIn app yet.
// When it comes back, pass `role={accountType}` the same way the Google button
// does — see the note on the prop in LinkedInSignInButton.
// import { LinkedInSignInButton } from "@/components/auth/LinkedInSignInButton";
import { useT } from "@/lib/i18n-client";
import type { AccountRole } from "@/lib/roles";

// THIS PAGE OWNS THE PICKED ROLE, and that is the only reason it is a client
// component.
//
// The form and the OAuth buttons are SIBLINGS — form, "or" divider, then the
// buttons — and they both need the same value. While the role lived in
// SignupForm's own useState it never reached the Google button, so its
// redirectTo carried no role, handle_new_user saw no account_type in
// raw_user_meta_data, and every OAuth signup was born a founder no matter what
// the visitor picked. With an explorer role that stops being a nuisance and
// becomes fatal: the Google button is the most prominent control here, so the
// new role would be unreachable for most signups.
//
// Lifting the state to the common parent is the ordinary React answer and it
// leaves the DOM exactly as it was — the alternative (moving the divider and
// the buttons inside SignupForm to share its client boundary) would have put
// page layout inside the form and changed where those nodes live. The cost is
// that the five strings here translate through useT() instead of tServer();
// same table, same keys, and the locale already reaches the client through
// <LocaleProvider> in app/layout.tsx.
export default function SignupPage() {
  const tr = useT();
  const [accountType, setAccountType] = useState<AccountRole>("founder");

  return (
    <div className="bg-white border border-line p-8 lg:p-10 rounded-xl">
      <h1 className="text-d2 mb-8">{tr("Create your profile")}</h1>

      <SignupForm
        accountType={accountType}
        onAccountTypeChange={setAccountType}
      />

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs uppercase tracking-[0.2em] text-ink-muted">
          {tr("or")}
        </span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <div className="space-y-3">
        {/* `next` is left at its default. The callback decides the destination
            from the role it just applied, so a founder still lands on
            /dashboard (and the app layout sends them into /onboarding, as
            before) while an explorer goes straight to their home — no second
            bounce through a route they cannot read. */}
        <GoogleSignInButton role={accountType} />
        {/* <LinkedInSignInButton role={accountType} /> */}
      </div>

      <p className="mt-6 text-xs text-ink-muted leading-relaxed">
        {tr("By continuing, you agree to our")}{" "}
        <Link href="/terms" className="underline hover:text-navy">
          {tr("Terms of Service")}
        </Link>{" "}
        {tr("and acknowledge our")}{" "}
        <Link href="/privacy" className="underline hover:text-navy">
          {tr("Privacy Policy")}
        </Link>
        .
      </p>

      <div className="mt-8 pt-6 border-t border-line text-center text-sm text-ink-muted">
        {tr("Already on Cofoundee?")}{" "}
        <Link href="/login" className="text-navy hover:text-gold-ink">
          {tr("Sign in")}
        </Link>
      </div>
    </div>
  );
}
