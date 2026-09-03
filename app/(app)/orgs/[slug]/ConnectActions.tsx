"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Clock, Handshake, MessageCircle, X } from "lucide-react";
import {
  requestConnectionAction,
  respondConnectionAction,
} from "../actions";
import { LinkButton } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

export type ConnState =
  | "self"
  | "no_org"
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected";

export function ConnectActions({
  targetOrgId,
  slug,
  state,
  connectionId,
}: {
  targetOrgId: string;
  slug: string;
  state: ConnState;
  connectionId?: string | null;
}) {
  const tr = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string } | { ok?: boolean }>) {
    setError(null);
    start(async () => {
      const res = await fn();
      if (res && "error" in res && res.error) setError(res.error);
      else router.refresh();
    });
  }

  if (state === "self") return null;

  if (state === "no_org") {
    // Was a dead-end sentence: the one thing that unlocks this panel had no
    // link to it anywhere on the page.
    return (
      <div className="space-y-3">
        <p className="text-xs text-ink-muted">
          {tr("Create a company to connect.")}
        </p>
        <LinkButton href="/orgs/new" size="sm" variant="secondary">
          {tr("Create company")}
        </LinkButton>
      </div>
    );
  }

  if (state === "connected") {
    return (
      <div className="space-y-2">
        <span className="inline-flex items-center gap-1.5 text-sm text-gold-ink">
          <Check className="w-4 h-4" />
          {tr("Connected")}
        </span>
        <Link
          href={`/orgs/${slug}/chat`}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors rounded-full"
        >
          <MessageCircle className="w-4 h-4" />
          {tr("Message")}
        </Link>
      </div>
    );
  }

  if (state === "pending_sent") {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-ink-muted">
        <Clock className="w-4 h-4" />
        {tr("Request sent")}
      </span>
    );
  }

  if (state === "pending_received") {
    return (
      <div>
        <p className="text-sm text-ink mb-2">
          {tr("This company wants to connect.")}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => respondConnectionAction(connectionId ?? "", true))
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm transition-colors"
          >
            <Check className="w-4 h-4" />
            {tr("Accept")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              run(() => respondConnectionAction(connectionId ?? "", false))
            }
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-line hover:border-navy disabled:opacity-50 text-ink text-sm transition-colors rounded-xl"
          >
            <X className="w-4 h-4" />
            {tr("Decline")}
          </button>
        </div>
        {error && <p className="text-xs text-danger-ink mt-1.5">{tr(error)}</p>}
      </div>
    );
  }

  // state === "none"
  return (
    <div>
      <button
        type="button"
        disabled={pending}
        onClick={() => run(() => requestConnectionAction(targetOrgId))}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-navy hover:bg-navy-dark disabled:opacity-50 text-white text-sm tracking-wide transition-colors"
      >
        <Handshake className="w-4 h-4" />
        {pending ? tr("Connecting…") : tr("Connect")}
      </button>
      {error && <p className="text-xs text-danger-ink mt-1.5">{tr(error)}</p>}
    </div>
  );
}
