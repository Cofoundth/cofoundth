"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { resetPasswordAction, type ResetState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

const INITIAL: ResetState = { step: "email" };

export function ForgotPasswordForm() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    INITIAL,
  );
  // resetPasswordAction returns English source strings — its own checks, and
  // the Supabase failures a member can actually reach (a wrong or expired
  // code, a rate limit), which it maps by error code — so they translate here
  // like any label. An unmapped Supabase message has no entry and passes
  // through in English (t() falls back to the string it was given).
  const error = state.error ? tr(state.error) : null;

  if (state.step === "verify") {
    return (
      <form action={formAction} className="space-y-5 short:space-y-4">
        <div className="text-sm text-ink leading-relaxed">
          {tr("We sent a 6-digit code to")}{" "}
          <span className="text-navy font-medium">{state.email}</span>.
        </div>

        <div>
          <label
            htmlFor="code"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("Verification code")}
          </label>
          <input
            id="code"
            name="code"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            autoComplete="one-time-code"
            autoFocus
            placeholder="••••••"
            className="w-full px-4 py-4 border border-line bg-white text-ink text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-navy font-serif rounded-xl"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("New password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
          />
          <p className="text-xs text-ink-muted mt-2">{tr("8+ characters.")}</p>
        </div>

        {error && (
          <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
            {error}
          </div>
        )}

        <Button type="submit" size="lg" fullWidth disabled={isPending}>
          {isPending ? tr("Resetting…") : tr("Reset password")}
          {!isPending && <ArrowRight className="w-4 h-4" />}
        </Button>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-5 short:space-y-4">
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
          autoFocus
          autoComplete="email"
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
        />
      </div>

      {error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {error}
        </div>
      )}

      <Button type="submit" size="lg" fullWidth disabled={isPending}>
        {isPending ? tr("Sending…") : tr("Send reset code")}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  );
}
