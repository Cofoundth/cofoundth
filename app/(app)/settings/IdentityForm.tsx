"use client";

// The whole Profile tab for a gated role (explorer, investor).
//
// Two fields, because two fields is the entire founder-less profile: a name
// and the photo the page renders above this. An explorer's name is public —
// they comment and they turn up on meetup guest lists — so it has to be
// editable somewhere, and this is the only place they can reach.
//
// Deliberately NOT a cut-down EditProfileFormClient. That component is the
// founder editor: thirty fields, its own validation, and a submit that writes
// `onboarded: true`. Sharing it would mean one form whose shape depends on a
// role prop, which is how the field you forgot to hide ships.

import { useActionState } from "react";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui";
import { updateIdentityAction, type EditProfileState } from "./actions";

const INITIAL: EditProfileState = null;

export function IdentityForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    EditProfileState,
    FormData
  >(updateIdentityAction, INITIAL);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="identity-first"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("First name")}
          </label>
          <input
            id="identity-first"
            name="first_name"
            type="text"
            required
            maxLength={40}
            autoComplete="given-name"
            defaultValue={firstName}
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
          />
        </div>
        <div>
          <label
            htmlFor="identity-last"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("Last name")}
          </label>
          <input
            id="identity-last"
            name="last_name"
            type="text"
            maxLength={40}
            autoComplete="family-name"
            defaultValue={lastName}
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
          />
        </div>
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {tr(state.error)}
        </div>
      )}
      {state?.ok && (
        <div className="text-sm text-gold-ink">{tr("Saved")}</div>
      )}

      {/* components/ui/Button.tsx defaults to type="button" — a submit here
          has to say so or the form silently stops submitting. */}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? tr("Saving…") : tr("Save")}
      </Button>
    </form>
  );
}
