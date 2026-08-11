"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Check, X } from "lucide-react";
import {
  investorConnectAction,
  respondInvestorConnectionAction,
} from "./actions";
import { useT } from "@/lib/i18n-client";

// Funding is investor-initiated: an investor connects to a company (targetId =
// orgId). Companies never cold-connect to investors.
export function FundingConnect({ targetId }: { targetId: string }) {
  const tr = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go() {
    setError(null);
    start(async () => {
      const res = await investorConnectAction(targetId);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={go}
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm transition-colors"
      >
        <Handshake className="w-4 h-4" />
        {pending ? tr("Connecting…") : tr("Connect")}
      </button>
      {error && (
        <p role="alert" className="text-xs text-red-700 mt-1.5">
          {tr(error)}
        </p>
      )}
    </div>
  );
}

export function FundingRespond({ connectionId }: { connectionId: string }) {
  const tr = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function go(accept: boolean) {
    setError(null);
    start(async () => {
      const res = await respondInvestorConnectionAction(connectionId, accept);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() => go(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-xs transition-colors"
        >
          <Check className="w-3.5 h-3.5" />
          {tr("Accept")}
        </button>
        <button
          type="button"
          disabled={pending}
          aria-busy={pending}
          onClick={() => go(false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-line hover:border-navy disabled:opacity-50 text-ink text-xs transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          {tr("Decline")}
        </button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-red-700 mt-1.5">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
