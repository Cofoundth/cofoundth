"use client";

import { useTransition } from "react";
import { useT } from "@/lib/i18n-client";
import { moderateReportAction } from "@/lib/post-actions";

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
        <button
          type="button"
          disabled={pending}
          onClick={() => act("remove")}
          className="px-3 py-1.5 text-xs bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white tracking-wide"
        >
          {tr("Remove content")}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => act("resolve")}
        className="px-3 py-1.5 text-xs border border-line text-ink hover:border-navy disabled:opacity-50"
      >
        {tr("Mark resolved")}
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => act("dismiss")}
        className="px-3 py-1.5 text-xs border border-line text-ink-muted hover:border-navy disabled:opacity-50"
      >
        {tr("Dismiss")}
      </button>
    </div>
  );
}
