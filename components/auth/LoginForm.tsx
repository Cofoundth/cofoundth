"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signInAction, type SignInState } from "@/app/(auth)/actions";

const INITIAL: SignInState = null;

export function LoginForm() {
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    signInAction,
    INITIAL,
  );

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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="password"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
          >
            Password
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-ink-muted hover:text-navy"
          >
            Forgot?
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-8 py-4 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
      >
        {isPending ? "Signing in…" : "Sign in"}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </button>
    </form>
  );
}
