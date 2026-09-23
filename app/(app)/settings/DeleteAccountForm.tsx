"use client";

import { useActionState, useState } from "react";
import { useT } from "@/lib/i18n-client";
import { Button } from "@/components/ui";
import { deleteAccountAction, type DeleteAccountState } from "./actions";

const INITIAL: DeleteAccountState = null;

// Two-step with a typed confirmation — this is the one truly irreversible
// action in the product. The confirm word stays the literal "DELETE" in both
// locales: a fixed token is harder to type on autopilot than a translated
// word, which is the point.
export function DeleteAccountForm() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    DeleteAccountState,
    FormData
  >(deleteAccountAction, INITIAL);
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  // `tracking-normal` on all three buttons: size="sm" carries the canonical
  // CTA face's tracking-wide and none of these had a tracking utility at HEAD.
  // Matches notifications:134 / BlockButton / MeetupsClient — the sweep keeps
  // letter-spacing byte-identical rather than restyling it here.

  if (!open) {
    return (
      <Button
        variant="danger-outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="tracking-normal"
      >
        {tr("Delete account")}
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <p className="text-sm text-danger-ink leading-relaxed">
        {tr(
          "This permanently deletes your profile, posts, messages, and matches. There is no undo.",
        )}
      </p>
      <label
        htmlFor="delete-confirm"
        className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
      >
        {tr("Type DELETE to confirm")}
      </label>
      <input
        id="delete-confirm"
        name="confirm"
        type="text"
        autoComplete="off"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        className="w-full max-w-xs px-3 py-2 border border-danger-line bg-white text-ink text-sm focus:outline-none focus:border-danger-ink rounded-xl"
      />
      {state?.error && (
        <div className="text-xs text-danger-ink">{tr(state.error)}</div>
      )}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setOpen(false);
            setConfirm("");
          }}
          disabled={isPending}
          className="tracking-normal"
        >
          {tr("Cancel")}
        </Button>
        <Button
          type="submit"
          variant="danger"
          size="sm"
          disabled={isPending || confirm.trim() !== "DELETE"}
          className="tracking-normal"
        >
          {isPending ? tr("Deleting…") : tr("Delete my account")}
        </Button>
      </div>
    </form>
  );
}
