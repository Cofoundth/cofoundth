"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  confirmDealAction,
  declineDealAction,
  cancelDealAction,
} from "../deal-actions";
import { useT } from "@/lib/i18n-client";

export function DealActions({
  dealId,
  role,
}: {
  dealId: string;
  role: "responder" | "proposer";
}) {
  const tr = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  if (role === "responder") {
    return (
      <div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => confirmDealAction(dealId))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-xs transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            {pending ? tr("Confirming…") : tr("Confirm")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => declineDealAction(dealId))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line hover:border-navy disabled:opacity-50 text-ink text-xs transition-colors rounded-full"
          >
            <X className="w-3.5 h-3.5" />
            {pending ? tr("Declining…") : tr("Decline")}
          </button>
        </div>
        {error && <p className="text-xs text-danger-ink mt-1">{tr(error)}</p>}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => cancelDealAction(dealId))}
        className="text-xs text-ink-muted hover:text-danger-ink disabled:opacity-50"
      >
        {pending ? tr("Withdrawing…") : tr("Withdraw")}
      </button>
      {error && <p className="text-xs text-danger-ink mt-1">{tr(error)}</p>}
    </div>
  );
}
