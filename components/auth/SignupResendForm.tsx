"use client";

import { useActionState, useId, useState } from "react";
import { resendSignupLinkAction, type ResendSignupState } from "@/app/(auth)/actions";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

export function SignupResendForm({ email, next }: { email?: string; next?: string }) {
  const tr = useT();
  const inputId = useId();
  const messageId = useId();
  const [enteredEmail, setEnteredEmail] = useState("");
  const [state, action, pending] = useActionState<ResendSignupState, FormData>(
    resendSignupLinkAction,
    null,
  );

  return (
    <form action={action} className="space-y-3">
      {next && <input type="hidden" name="next" value={next} />}
      {email ? (
        <input type="hidden" name="email" value={email} />
      ) : (
        <div>
          <label htmlFor={inputId} className="mb-2 block text-sm">
            {tr("Email")}
          </label>
          <input
            id={inputId}
            name="email"
            type="email"
            autoComplete="email"
            required
            value={enteredEmail}
            onChange={(event) => setEnteredEmail(event.target.value)}
            aria-describedby={state ? messageId : undefined}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-ink"
          />
        </div>
      )}
      <Button type="submit" variant="secondary" disabled={pending}>
        {tr(pending ? "Sending…" : "Resend link")}
      </Button>
      <p
        id={messageId}
        role="status"
        className={state?.status === "error" ? "text-sm text-danger-ink" : "text-sm text-ink-muted"}
      >
        {state && tr(state.message)}
      </p>
    </form>
  );
}
