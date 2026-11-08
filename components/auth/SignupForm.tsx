"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Mail, X } from "lucide-react";
import { signupAction, type SignupState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";
import { FEATURES } from "@/lib/features";
import { useT } from "@/lib/i18n-client";
import type { AccountRole } from "@/lib/roles";

const INITIAL: SignupState = { step: "credentials" };

// Client-side mirror of validatePassword() in app/(auth)/actions.ts.
// Server re-checks on submit; this is for inline feedback only.
const passwordRules = (pw: string) => ({
  length: pw.length >= 8,
  letter: /[a-zA-Z]/.test(pw),
  number: /[0-9]/.test(pw),
});

// Registration persona. Admin is NOT here — it's a granted privilege, never
// self-selected.
//
// The copy describes what you came to DO, not what you ARE: the pivot is one
// level earlier than "startup", so the person we want has no company to name
// themselves after yet — "Founder / Company" asked them to claim a title they
// haven't earned. An explorer is here to TRY what the community builds, which
// is the demand side of /products.
//
// Investor stays in the list and is filtered out by FEATURES.investorSignup
// (false today). It is NOT deleted: there are real investor accounts in
// production, and flipping that flag has to put this option back exactly here
// rather than require someone to reconstruct it. See lib/features.ts.
const ACCOUNT_TYPES = [
  {
    value: "founder",
    en: "I'm building something",
    hint: "Show it, find your first users",
  },
  {
    value: "explorer",
    en: "I want to try new things",
    hint: "Try what the community builds",
  },
  { value: "investor", en: "Investor", hint: "Back startups · early access" },
] as const satisfies readonly { value: AccountRole; en: string; hint: string }[];

export function SignupForm({
  accountType,
  onAccountTypeChange,
}: {
  // The picked role is OWNED BY THE PAGE, not by this form. The OAuth buttons
  // are siblings of this component and have to send the same value — that is
  // the whole bug being fixed here (the role used to live in this component's
  // own useState and never left it, so every Google signup was born a
  // founder). app/(auth)/signup/page.tsx holds it; see the note there.
  accountType: AccountRole;
  onAccountTypeChange: (value: AccountRole) => void;
}) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<SignupState, FormData>(
    signupAction,
    INITIAL,
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const options = ACCOUNT_TYPES.filter(
    (opt) => opt.value !== "investor" || FEATURES.investorSignup,
  );

  if (state.step === "check_email") {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-4 p-5 bg-cream border border-line rounded-xl">
          <Mail className="w-6 h-6 text-gold-ink shrink-0 mt-0.5" strokeWidth={1.5} />
          <div className="space-y-2">
            <div className="text-navy font-medium">{tr("Check your email")}</div>
            <div className="text-sm text-ink leading-relaxed">
              {tr("We sent a confirmation link to")}{" "}
              <span className="text-navy font-medium">{state.email}</span>.{" "}
              {tr("Click it to activate your account.")}
            </div>
          </div>
        </div>
        <div className="text-xs text-ink-muted leading-relaxed">
          {tr(
            "Didn’t arrive? Check your spam folder. The link expires in 24 hours.",
          )}
        </div>
      </div>
    );
  }

  const rules = passwordRules(password);
  const allRulesPass = rules.length && rules.letter && rules.number;
  const passwordsMatch =
    confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch =
    confirmPassword.length > 0 && password !== confirmPassword;

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="account_type" value={accountType} />

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
          {tr("I'm joining as")}
        </label>
        <div className="grid grid-cols-2 gap-3">
          {options.map((opt, i) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAccountTypeChange(opt.value)}
              aria-pressed={accountType === opt.value}
              // two-line selection cards, not pills — the base rule would give
              // these ~32px end-caps
              //
              // Two options fill the 2-col grid exactly. A THIRD (flip
              // FEATURES.investorSignup back on) would otherwise leave a
              // half-width orphan on row 2, which reads as a layout bug rather
              // than a choice — so an odd last card spans the row. With an even
              // count it contributes no class, so today's two cards render
              // exactly as before.
              className={`text-left p-3 rounded-xl border transition-colors ${
                i === options.length - 1 && options.length % 2 === 1
                  ? "col-span-2"
                  : ""
              } ${
                accountType === opt.value
                  ? "bg-cream border-navy"
                  : "bg-white border-line hover:border-navy"
              }`}
            >
              <div className="text-sm text-navy font-medium">{tr(opt.en)}</div>
              <div className="text-xs text-ink-muted mt-0.5">{tr(opt.hint)}</div>
            </button>
          ))}
        </div>
        {/* The old copy ("This can't be changed later — founders and investors
            use separate accounts") was false on both halves once the explorer
            role shipped: explorer -> founder is a deliberate one-way upgrade,
            because it is the funnel — try things, get inspired, build
            something. It still is not a general role switcher, so this says
            which way the door opens and nothing more. */}
        <p className="text-xs text-ink-muted mt-2">
          {tr(
            "Not sure? Start by trying things — you can switch to building later.",
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="firstName"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("First name")}
          </label>
          <input
            id="firstName"
            name="firstName"
            type="text"
            required
            autoComplete="given-name"
            autoFocus
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
          />
        </div>
        <div>
          <label
            htmlFor="lastName"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("Last name")}
          </label>
          <input
            id="lastName"
            name="lastName"
            type="text"
            autoComplete="family-name"
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="email"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Password")}
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="new-password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 pr-11 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted hover:text-navy"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>

        {password.length > 0 && (
          <ul className="mt-3 space-y-1.5 text-xs">
            <RuleRow ok={rules.length} label={tr("At least 8 characters")} />
            <RuleRow ok={rules.letter} label={tr("Contains a letter")} />
            <RuleRow ok={rules.number} label={tr("Contains a number")} />
          </ul>
        )}
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Confirm password")}
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`w-full px-4 py-3 border bg-white text-ink focus:outline-none ${
            passwordsMismatch
              ? "border-danger-line focus:border-danger-ink"
              : passwordsMatch
                ? "border-line focus:border-line"
                : "border-line focus:border-navy"
          }`}
        />
        {passwordsMatch && (
          <p className="text-xs text-gold-ink mt-2 inline-flex items-center gap-1.5">
            <Check className="w-3 h-3" /> {tr("Passwords match")}
          </p>
        )}
        {passwordsMismatch && (
          <p className="text-xs text-danger-ink mt-2 inline-flex items-center gap-1.5">
            <X className="w-3 h-3" /> {tr("Passwords don’t match")}
          </p>
        )}
      </div>

      {state.error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {state.error}
        </div>
      )}

      <Button
        type="submit"
        size="lg"
        fullWidth
        disabled={isPending || !allRulesPass || !passwordsMatch}
      >
        {isPending ? tr("Creating account…") : tr("Continue")}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  );
}

function RuleRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`inline-flex items-center gap-2 ${
        ok ? "text-gold-ink" : "text-ink-muted"
      }`}
    >
      {ok ? (
        <Check className="w-3 h-3 shrink-0" />
      ) : (
        <span className="w-3 h-3 inline-block rounded-full border border-current shrink-0" />
      )}
      <span>{label}</span>
      <br />
    </li>
  );
}
