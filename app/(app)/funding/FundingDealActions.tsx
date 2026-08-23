"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import {
  confirmInvestorDealAction,
  declineInvestorDealAction,
  cancelInvestorDealAction,
} from "./actions";
import { useT } from "@/lib/i18n-client";

// role="confirm": the viewer is the responder (didn't propose) — confirm/decline
// role="withdraw": the viewer proposed — withdraw
export function FundingDealActions({
  dealId,
  role,
}: {
  dealId: string;
  role: "confirm" | "withdraw";
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

  if (role === "withdraw") {
    return (
      <div>
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() => run(() => cancelInvestorDealAction(dealId))}
          className="text-xs text-ink-muted hover:text-red-700 disabled:opacity-50"
        >
          {pending ? tr("Withdrawing…") : tr("Withdraw")}
        </button>
        {error && (
          <p role="alert" className="text-xs text-red-700 mt-1">
            {tr(error)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() => run(() => confirmInvestorDealAction(dealId))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-xs transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {pending ? tr("Confirming…") : tr("Confirm")}
        </button>
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() => run(() => declineInvestorDealAction(dealId))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line hover:border-navy disabled:opacity-50 text-ink text-xs transition-colors rounded-full"
        >
          <X className="w-3.5 h-3.5" />
          {tr("Decline")}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700 mt-1">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
