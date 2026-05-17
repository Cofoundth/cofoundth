"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { resetPasswordAction, type ResetState } from "@/app/(auth)/actions";

const INITIAL: ResetState = { step: "email" };

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState<ResetState, FormData>(
    resetPasswordAction,
    INITIAL,
  );

  if (state.step === "verify") {
    return (
      <form action={formAction} className="space-y-5">
        <div className="text-sm text-ink leading-relaxed">
          We sent a 6-digit code to{" "}
          <span className="text-navy font-medium">{state.email}</span>.
        </div>

        <div>
          <label
            htmlFor="code"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            Verification code
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
            className="w-full px-4 py-4 border border-line bg-white text-ink text-center text-2xl tracking-[0.5em] focus:outline-none focus:border-navy font-serif"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            New password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            minLength={8}
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
          />
          <p className="text-xs text-ink-muted mt-2">8+ characters.</p>
        </div>

        {state.error && (
          <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full px-8 py-4 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
        >
          {isPending ? "Resetting…" : "Reset password"}
          {!isPending && <ArrowRight className="w-4 h-4" />}
        </button>
      </form>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoFocus
          autoComplete="email"
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      {state.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-8 py-4 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
      >
        {isPending ? "Sending…" : "Send reset code"}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </button>
    </form>
  );
}
