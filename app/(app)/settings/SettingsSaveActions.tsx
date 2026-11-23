"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

export type EditOutcome = "saved" | "discarded";

export function SettingsSaveActions({
  dirty,
  canSave = dirty,
  saving,
  uploading = false,
  outcome,
  error,
  onDiscard,
}: {
  dirty: boolean;
  canSave?: boolean;
  saving: boolean;
  uploading?: boolean;
  outcome: EditOutcome | null;
  error: string | null;
  onDiscard: () => void;
}) {
  const tr = useT();
  const statusRef = useRef<HTMLParagraphElement>(null);
  const busy = saving || uploading;
  const status = dirty
    ? tr("Unsaved changes")
    : outcome === "saved" ? tr("Saved")
      : outcome === "discarded" ? tr("Changes discarded") : "";

  useEffect(() => {
    if (outcome) statusRef.current?.focus({ preventScroll: true });
  }, [outcome]);

  return (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-4">
      <div className="grid grid-cols-1 gap-2 min-[360px]:grid-cols-2 sm:flex">
        <Button type="submit" size="sm" className="min-h-11" disabled={busy || !canSave}>
          {tr(saving ? "Saving…" : "Save changes")}
        </Button>
        <Button variant="secondary" size="sm" className="min-h-11" disabled={busy || (!dirty && !error)} onClick={onDiscard}>
          {tr("Discard changes")}
        </Button>
      </div>
      <div>
        <p ref={statusRef} role="status" tabIndex={-1} className="text-sm text-ink-muted">
          {status}
        </p>
        {error && <p role="alert" className="text-sm text-danger-ink">{tr(error)}</p>}
      </div>
    </div>
  );
}
