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

import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n-client";
import { updateIdentityAction } from "./actions";
import { SettingsSaveActions, type EditOutcome } from "./SettingsSaveActions";

export function IdentityForm({
  firstName,
  lastName,
}: {
  firstName: string;
  lastName: string;
}) {
  const tr = useT();
  const [saved, setSaved] = useState({ first: firstName, last: lastName });
  const [draft, setDraft] = useState(saved);
  const [outcome, setOutcome] = useState<EditOutcome | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dirty = draft.first !== saved.first || draft.last !== saved.last;

  function save(formData: FormData) {
    if (isPending || !dirty) return;
    setError(null);
    startTransition(async () => {
      const result = await updateIdentityAction(formData).catch(() => ({
        error: "Couldn’t save your changes. Try again.",
      }));
      if ("error" in result) {
        setError(result.error);
        return;
      }
      const names = { first: result.profile.first_name ?? "", last: result.profile.last_name ?? "" };
      setSaved(names);
      setDraft(names);
      setOutcome("saved");
    });
  }

  function discard() {
    setDraft(saved);
    setError(null);
    setOutcome("discarded");
  }

  return (
    <form onSubmit={(event) => {
      event.preventDefault();
      save(new FormData(event.currentTarget));
    }} className="space-y-5">
      <fieldset disabled={isPending} className="grid min-w-0 grid-cols-2 gap-4">
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
            value={draft.first}
            onChange={(event) => {
              setDraft({ ...draft, first: event.target.value });
              setOutcome(null);
            }}
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
            value={draft.last}
            onChange={(event) => {
              setDraft({ ...draft, last: event.target.value });
              setOutcome(null);
            }}
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy rounded-xl"
          />
        </div>
      </fieldset>

      <SettingsSaveActions
        dirty={dirty}
        saving={isPending}
        outcome={outcome}
        error={error}
        onDiscard={discard}
      />
    </form>
  );
}
