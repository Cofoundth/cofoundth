"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Handshake, Check, X } from "lucide-react";
import {
  investorConnectAction,
  respondInvestorConnectionAction,
} from "./actions";
import { Button } from "@/components/ui";
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
      <Button
        size="sm"
        disabled={pending}
        aria-busy={pending}
        onClick={go}
        className="tracking-normal"
      >
        <Handshake className="w-4 h-4" />
        {pending ? tr("Connecting…") : tr("Connect")}
      </Button>
      {error && (
        <p role="alert" className="text-xs text-danger-ink mt-1.5">
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
        <Button
          size="xs"
          disabled={pending}
          aria-busy={pending}
          onClick={() => go(true)}
        >
          <Check className="w-3.5 h-3.5" />
          {tr("Accept")}
        </Button>
        <Button
          variant="secondary"
          size="xs"
          disabled={pending}
          aria-busy={pending}
          onClick={() => go(false)}
        >
          <X className="w-3.5 h-3.5" />
          {tr("Decline")}
        </Button>
      </div>
      {error && (
        <p role="alert" className="text-xs text-danger-ink mt-1.5">
          {tr(error)}
        </p>
      )}
    </div>
  );
}
