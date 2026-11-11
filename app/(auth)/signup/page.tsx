"use client";

import { use, useState } from "react";
import Link from "next/link";
import { SignupForm } from "@/components/auth/SignupForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
// LinkedIn login disabled for now — provider not enabled in Supabase + no LinkedIn app yet.
// When it comes back, pass `role={accountType}` the same way the Google button
// does — see the note on the prop in LinkedInSignInButton.
// import { LinkedInSignInButton } from "@/components/auth/LinkedInSignInButton";
import { useT } from "@/lib/i18n-client";
import type { AccountRole } from "@/lib/roles";
import { authHref } from "@/lib/auth-href";
import { safeNextPath } from "@/lib/safe-next";

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
//
// `?next=` is the product a sign-up started from (lib/auth-href.ts). A client
// page reads it with use(searchParams). It is checked here so a refused value
// travels no further, and checked AGAIN by everything that follows it —
// signupAction, the OAuth callback, onboarding — since a hidden field and a
// redirectTo are as forgeable as this URL.
export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}) {
  const tr = useT();
  const next = safeNextPath(use(searchParams).next);
  const [accountType, setAccountType] = useState<AccountRole>("founder");

  return (
    <div className="bg-white border border-line p-8 lg:p-10 rounded-xl">
      <h1 className="text-d2 mb-8">{tr("Create your profile")}</h1>

      <SignupForm
        accountType={accountType}
        onAccountTypeChange={setAccountType}
        next={next ?? undefined}
      />

      <div className="flex items-center gap-4 my-6">
        <div className="flex-1 h-px bg-line" />
        <span className="text-xs uppercase tracking-[0.2em] text-ink-muted">
          {tr("or")}
        </span>
        <div className="flex-1 h-px bg-line" />
      </div>

      <div className="space-y-3">
        {/* `next` is the product or the deck when the sign-up started from
            one, and the button's /dashboard default otherwise. Either way the
            callback settles the destination from the role it just applied: an
            explorer sent to /dashboard goes straight to their home instead,
            and a founder who has not onboarded is sent to /onboarding with
            the page they were heading for as its `next` (lib/auth-href.ts
            throughOnboarding), so finishing it lands them there. */}
        <GoogleSignInButton role={accountType} next={next ?? undefined} />
        {/* <LinkedInSignInButton role={accountType} next={next ?? undefined} /> */}
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
        <Link
          href={next ? authHref("/login", next) : "/login"}
          className="text-navy hover:text-gold-ink"
        >
          {tr("Sign in")}
        </Link>
      </div>
    </div>
  );
}
