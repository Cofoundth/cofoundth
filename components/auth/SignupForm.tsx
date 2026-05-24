"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff, Mail, X } from "lucide-react";
import { signupAction, type SignupState } from "@/app/(auth)/actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: SignupState = { step: "credentials" };

// Client-side mirror of validatePassword() in app/(auth)/actions.ts.
// Server re-checks on submit; this is for inline feedback only.
const passwordRules = (pw: string) => ({
  length: pw.length >= 8,
  letter: /[a-zA-Z]/.test(pw),
  number: /[0-9]/.test(pw),
});

export function SignupForm() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<SignupState, FormData>(
    signupAction,
    INITIAL,
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (state.step === "check_email") {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-4 p-5 bg-cream border border-line">
          <Mail className="w-6 h-6 text-gold shrink-0 mt-0.5" strokeWidth={1.5} />
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
      <div>
        <label
          htmlFor="fullName"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Full name")}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          autoFocus
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
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
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
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
            className="w-full px-4 py-3 pr-11 border border-line bg-white text-ink focus:outline-none focus:border-navy"
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
              ? "border-red-400 focus:border-red-500"
              : passwordsMatch
                ? "border-gold focus:border-gold"
                : "border-line focus:border-navy"
          }`}
        />
        {passwordsMatch && (
          <p className="text-xs text-gold mt-2 inline-flex items-center gap-1.5">
            <Check className="w-3 h-3" /> {tr("Passwords match")}
          </p>
        )}
        {passwordsMismatch && (
          <p className="text-xs text-red-700 mt-2 inline-flex items-center gap-1.5">
            <X className="w-3 h-3" /> {tr("Passwords don’t match")}
          </p>
        )}
      </div>

      {state.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending || !allRulesPass || !passwordsMatch}
        className="w-full px-8 py-4 bg-navy hover:bg-navy-dark disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
      >
        {isPending ? tr("Creating account…") : tr("Continue")}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </button>
    </form>
  );
}

function RuleRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li
      className={`inline-flex items-center gap-2 ${
        ok ? "text-gold" : "text-ink-muted"
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
