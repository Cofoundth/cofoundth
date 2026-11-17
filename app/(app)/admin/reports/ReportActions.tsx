"use client";

import { useState, useTransition } from "react";
import { useT } from "@/lib/i18n-client";
import { moderateReportAction } from "@/lib/post-actions";
import { Button } from "@/components/ui";

export function ReportActions({
  reportId,
  canRemove,
}: {
  reportId: string;
  canRemove: boolean;
}) {
  const tr = useT();
  const [pending, start] = useTransition();
  // A failed removal leaves the report open and says so here, rather than
  // the row silently staying put.
  const [error, setError] = useState<string | null>(null);
  const act = (decision: "remove" | "resolve" | "dismiss") =>
    start(async () => {
      // The request itself failed: say what was being attempted.
      const res = await moderateReportAction(reportId, decision).catch(() => ({
        error:
          decision === "remove"
            ? "Couldn’t remove it. Try again."
            : "Couldn’t update the report. Try again.",
      }));
      setError(res?.error ?? null);
    });

  return (
    <>
      {error && (
        <p role="alert" className="mt-3 text-xs text-danger-ink">
          {tr(error)}
        </p>
      )}
      <div className="flex flex-wrap gap-2 mt-3">
        {canRemove && (
          <Button
            variant="danger"
            size="xs"
            className="tracking-wide"
            disabled={pending}
            onClick={() => act("remove")}
          >
            {tr("Remove content")}
          </Button>
        )}
        <Button
          variant="secondary"
          size="xs"
          disabled={pending}
          onClick={() => act("resolve")}
        >
          {tr("Mark resolved")}
        </Button>
        <Button
          variant="secondary"
          size="xs"
          className="text-ink-muted"
          disabled={pending}
          onClick={() => act("dismiss")}
        >
          {tr("Dismiss")}
        </Button>
      </div>
    </>
  );
}
