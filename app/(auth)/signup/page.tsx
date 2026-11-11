"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  SignupForm,
  SignupRolePicker,
  useSignupAction,
} from "@/components/auth/SignupForm";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { AUTH_CARD } from "@/components/auth/auth-card";
import { cn } from "@/components/ui";
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
// Lifting the state to the common parent is the ordinary React answer — the
// alternative (moving the divider and the buttons inside SignupForm to share
// its client boundary) would have put page layout inside the form. The page
// now also holds the form's action state (useSignupAction) and renders the
// role picker itself, apart from both the form and the buttons, which is what
// lets the two-column layout below give it a column of its own. The cost
// is that the strings here translate through useT() instead of tServer(); same
// table, same keys, and the locale already reaches the client through
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
  // The form's action state lives here too: the picker goes once the
  // confirmation email is sent, and only this state knows it has been.
  const [state, formAction, isPending] = useSignupAction();

  const sent = state.step === "check_email";

  // The two links never break inside themselves: in the wide card's narrow
  // left column "เงื่อนไขการใช้งาน" otherwise split across two lines.
  const terms = (
    <>
      {tr("By continuing, you agree to our")}{" "}
      <Link href="/terms" className="underline whitespace-nowrap hover:text-navy">
        {tr("Terms of Service")}
      </Link>{" "}
      {tr("and acknowledge our")}{" "}
      <Link href="/privacy" className="underline whitespace-nowrap hover:text-navy">
        {tr("Privacy Policy")}
      </Link>
      .
    </>
  );
  const signIn = (
    <>
      {tr("Already on Cofoundee?")}{" "}
      <Link
        href={next ? authHref("/login", next) : "/login"}
        className="text-navy hover:text-gold-ink"
      >
        {tr("Sign in")}
      </Link>
    </>
  );

  // ONE SCREEN AT LAPTOP HEIGHTS (the owner's call, 2026-11-11), which one
  // column cannot do: the form alone is ~570px. So from md the card widens into
  // two columns that read left to right as the two decisions:
  //   left   WHO you are joining as — the title, the role cards stacked, and at
  //          the foot the terms and the way back to sign-in
  //   right  HOW you sign up — the email form, "or", then Google (the owner's
  //          order: Google sits under the form, not above it)
  // with a plain rule between them. The role sits left of BOTH ways in, since
  // it applies to both (the form's hidden input, the Google button's `role`).
  // Below md it is one column in reading order — role, form, "or", Google,
  // terms, sign-in — and it scrolls: a phone is not where this has to fit. The
  // terms and the sign-in link are therefore drawn twice, each copy shown at
  // one size only (display:none hides the other from assistive tech too).
  //
  // Once the confirmation email is sent, the role, "or" and the Google button
  // go: the right column is then only SignupForm's "check your email".
  return (
    <div className={cn(AUTH_CARD, "md:max-w-[50rem]")}>
      <div className="md:grid md:grid-cols-[15rem_1px_minmax(0,1fr)] md:gap-8">
        <div className="flex flex-col">
          <h1 className="text-d2 mb-5">{tr("Create your profile")}</h1>
          {!sent && (
            <SignupRolePicker value={accountType} onChange={setAccountType} />
          )}
          <div className="hidden md:mt-auto md:block md:pt-6">
            <p className="text-xs text-ink-muted leading-relaxed">{terms}</p>
            <p className="mt-4 text-sm text-ink-muted">{signIn}</p>
          </div>
        </div>

        <div aria-hidden="true" className="hidden bg-line md:block" />

        <div className="mt-6 min-w-0 md:mt-0">
          <SignupForm
            accountType={accountType}
            next={next ?? undefined}
            state={state}
            formAction={formAction}
            isPending={isPending}
          />

          {!sent && (
            <>
              <div className="flex items-center gap-4 my-4 short:my-3">
                <div className="flex-1 h-px bg-line" />
                <span className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                  {tr("or")}
                </span>
                <div className="flex-1 h-px bg-line" />
              </div>

              <div className="space-y-3">
                {/* `next` is the product or the deck when the sign-up started
                    from one, and the button's /dashboard default otherwise.
                    Either way the callback settles the destination from the
                    role it just applied: an explorer sent to /dashboard goes
                    straight to their home instead, and a founder who has not
                    onboarded is sent to /onboarding with the page they were
                    heading for as its `next` (lib/auth-href.ts
                    throughOnboarding), so finishing it lands them there. */}
                <GoogleSignInButton role={accountType} next={next ?? undefined} />
                {/* <LinkedInSignInButton role={accountType} next={next ?? undefined} /> */}
              </div>
            </>
          )}
        </div>

        <div className="md:hidden">
          <p className="mt-6 text-xs text-ink-muted leading-relaxed">{terms}</p>
          <div className="mt-6 pt-5 border-t border-line text-center text-sm text-ink-muted">
            {signIn}
          </div>
        </div>
      </div>
    </div>
  );
}
