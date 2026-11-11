"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signInAction, type SignInState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

const INITIAL: SignInState = null;

export function LoginForm({ next }: { next?: string }) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<SignInState, FormData>(
    signInAction,
    INITIAL,
  );

  return (
    <form action={formAction} className="space-y-5">
      {/* Where to land after signing in. signInAction re-checks it with
          lib/safe-next.ts — a hidden field is as forgeable as the URL. */}
      {next && <input type="hidden" name="next" value={next} />}
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

      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="password"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
          >
            {tr("Password")}
          </label>
          <Link
            href="/forgot-password"
            className="text-xs text-ink-muted hover:text-navy"
          >
            {tr("Forgot?")}
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
        />
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {state.error}
        </div>
      )}

      <Button type="submit" size="lg" fullWidth disabled={isPending}>
        {isPending ? tr("Signing in…") : tr("Sign in")}
        {!isPending && <ArrowRight className="w-4 h-4" />}
      </Button>
    </form>
  );
}
