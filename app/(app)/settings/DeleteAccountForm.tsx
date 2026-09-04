"use client";

import { useActionState, useState } from "react";
import { useT } from "@/lib/i18n-client";
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

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 border border-danger-line text-sm text-danger-ink hover:bg-danger-surface transition-colors rounded-full"
      >
        {tr("Delete account")}
      </button>
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
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setConfirm("");
          }}
          disabled={isPending}
          className="px-4 py-2 border border-line text-sm text-ink hover:border-navy rounded-full"
        >
          {tr("Cancel")}
        </button>
        <button
          type="submit"
          disabled={isPending || confirm.trim() !== "DELETE"}
          className="px-4 py-2 bg-danger-ink hover:bg-danger-ink-dark disabled:opacity-50 text-white text-sm transition-colors rounded-full"
        >
          {isPending ? tr("Deleting…") : tr("Delete my account")}
        </button>
      </div>
    </form>
  );
}
