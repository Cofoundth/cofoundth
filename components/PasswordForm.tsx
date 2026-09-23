"use client";

import { useActionState } from "react";
import {
  setPasswordAction,
  type PasswordState,
} from "@/app/(app)/settings/actions";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui";

const input =
  "w-full px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy";
const label = "block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2";

export function PasswordForm() {
  const tr = useT();
  const [state, action, pending] = useActionState<PasswordState, FormData>(
    setPasswordAction,
    null,
  );
  return (
    <form action={action} className="grid sm:grid-cols-2 gap-4">
      <div>
        <label htmlFor="pw" className={label}>
          {tr("New password")}
        </label>
        <input
          id="pw"
          type="password"
          name="password"
          minLength={8}
          required
          autoComplete="new-password"
          className={input}
        />
      </div>
      <div>
        <label htmlFor="pw2" className={label}>
          {tr("Confirm password")}
        </label>
        <input
          id="pw2"
          type="password"
          name="confirm"
          minLength={8}
          required
          autoComplete="new-password"
          className={input}
        />
      </div>
      <div className="sm:col-span-2 flex items-center gap-4">
        {/* variant="outline" IS this face (see Button.tsx on D5); `px-5 py-2.5`
            is the documented off-scale padding kept at the call site. The old
            `disabled:opacity-50` is exactly what BASE applies, so nothing is
            lost. Measured identical: 104.43x41.60, both locales, resting and
            hovered. */}
        <Button
          type="submit"
          variant="outline"
          className="px-5 py-2.5"
          disabled={pending}
        >
          {pending ? tr("Saving…") : tr("Set password")}
        </Button>
        {state?.ok && (
          <span className="text-sm text-green-700">
            {tr("Password updated.")}
          </span>
        )}
        {state?.error && (
          <span className="text-sm text-danger-ink">{state.error}</span>
        )}
      </div>
    </form>
  );
}
