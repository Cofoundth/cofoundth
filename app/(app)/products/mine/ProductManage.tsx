"use client";

// A maker's two controls for one of their products on My products: Edit, and
// Delete behind a confirmation. Deleting takes the product's ratings and
// comments with it and cannot be undone, so it is a modal that says exactly
// that, with Cancel first; the action (deleteProductAction in
// lib/post-actions.ts) re-checks that the product is the caller's, and the
// list re-renders without it.

import { useId, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { deleteProductAction } from "@/lib/post-actions";
import { editProductPath } from "@/lib/post-types";
import { useT } from "@/lib/i18n-client";
import { Button, Dialog, LinkButton } from "@/components/ui";

/** A server action that threw (offline, a dropped request) rather than
 *  answering with its own error. An existing dictionary key. */
const UNREACHABLE = "Something went wrong. Try again.";

export function ProductManage({
  id,
  name,
  hidden,
}: {
  id: string;
  name: string;
  /** Hidden by a moderator: it is not on the deck, so the dialog does not say
   *  deleting takes it off. */
  hidden: boolean;
}) {
  const tr = useT();
  const titleId = useId();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function close() {
    if (pending) return;
    setConfirming(false);
    setError(null);
  }

  function remove() {
    start(async () => {
      const res = await deleteProductAction(id).catch(() => ({
        error: UNREACHABLE,
      }));
      if (res?.error) setError(res.error);
      else setConfirming(false);
    });
  }

  return (
    <>
      <LinkButton href={editProductPath(id)} variant="secondary" size="sm">
        <Pencil className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {tr("Edit")}
      </LinkButton>
      <Button
        variant="danger-outline"
        size="sm"
        onClick={() => setConfirming(true)}
      >
        <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {tr("Delete")}
      </Button>

      {confirming && (
        <Dialog
          onClose={close}
          labelledBy={titleId}
          size="md"
          dismissible={!pending}
        >
          <h2 id={titleId} className="mb-2 text-lg font-bold tracking-normal">
            {/* A function, not the string: a name like "Make $$ fast" would
                otherwise be read as a replacement pattern ($$ -> $). */}
            {tr("Delete {name}?").replace("{name}", () => name)}
          </h2>
          <p className="text-sm leading-relaxed text-ink-muted">
            {hidden
              ? tr(
                  "Its ratings and comments are deleted with it. This can’t be undone.",
                )
              : tr(
                  "It comes off the deck, and its ratings and comments are deleted with it. This can’t be undone.",
                )}
          </p>
          {error && (
            <p className="mt-4 text-sm text-danger-ink" role="alert">
              {tr(error)}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Button variant="secondary" onClick={close} disabled={pending}>
              {tr("Cancel")}
            </Button>
            <Button variant="danger" onClick={remove} disabled={pending}>
              <Trash2 className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              {pending ? tr("Deleting…") : tr("Delete")}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
