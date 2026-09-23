"use client";

import { useTransition } from "react";
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
  const act = (decision: "remove" | "resolve" | "dismiss") =>
    start(async () => {
      await moderateReportAction(reportId, decision);
    });

  return (
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
  );
}
