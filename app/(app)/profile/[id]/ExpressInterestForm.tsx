"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, MessageCircle, Heart } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { expressInterestAction, type InterestState } from "./actions";

const INITIAL: InterestState = null;

type Relationship = "none" | "outgoing" | "incoming" | "matched";

type Props = {
  toId: string;
  relationship: Relationship;
  matchId: string | null;
  otherName: string;
};

export function ExpressInterestForm({
  toId,
  relationship,
  matchId,
  otherName,
}: Props) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<InterestState, FormData>(
    expressInterestAction,
    INITIAL,
  );
  const [open, setOpen] = useState(false);

  // Accepting an incoming interest creates the match immediately (DB trigger),
  // so confirm the connection rather than showing "interest sent".
  const justConnected = !!state?.ok && relationship === "incoming";

  // ── Connected (matched, or just accepted) ──────────────────────────
  if (relationship === "matched" || justConnected) {
    return (
      <div className="bg-cream border border-gold/40 p-6 text-center">
        <div className="w-12 h-12 bg-white border border-gold/40 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-gold" strokeWidth={2} />
        </div>
        <div className="text-sm font-medium text-navy mb-1">
          {tr("You're connected")}
        </div>
        <p className="text-xs text-ink-muted leading-relaxed mb-4">
          {tr("Messaging is unlocked — start the conversation.")}
        </p>
        <Link
          href={matchId ? `/messages/${matchId}` : "/matches"}
          className="w-full px-6 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          {tr("Message {name}").replace("{name}", otherName)}
        </Link>
      </div>
    );
  }

  // ── Incoming interest → one-click accept ───────────────────────────
  if (relationship === "incoming") {
    return (
      <div className="bg-cream border border-gold/40 p-6">
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-white border border-gold/40 flex items-center justify-center mx-auto mb-3">
            <Heart className="w-5 h-5 text-gold" strokeWidth={2} />
          </div>
          <div className="text-sm font-medium text-navy">
            {tr("{name} is interested in connecting").replace(
              "{name}",
              otherName,
            )}
          </div>
          <p className="text-xs text-ink-muted leading-relaxed mt-1">
            {tr("Accept to connect — messaging unlocks for both of you.")}
          </p>
        </div>
        {state?.error && (
          <div className="px-4 py-3 mb-3 border border-red-300 bg-red-50 text-sm text-red-800">
            {state.error}
          </div>
        )}
        <form action={formAction}>
          <input type="hidden" name="toId" value={toId} />
          <button
            type="submit"
            disabled={isPending}
            className="w-full px-6 py-4 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
          >
            {isPending ? tr("Connecting…") : tr("Accept & connect")}
            {!isPending && <Check className="w-4 h-4" />}
          </button>
        </form>
      </div>
    );
  }

  // ── Outgoing interest already sent (waiting) ───────────────────────
  if (relationship === "outgoing" || state?.ok) {
    return (
      <div className="bg-cream border border-gold/40 p-6 text-center">
        <div className="w-12 h-12 bg-white border border-gold/40 flex items-center justify-center mx-auto mb-3">
          <Check className="w-5 h-5 text-gold" strokeWidth={2} />
        </div>
        <div className="text-sm font-medium text-navy mb-1">
          {tr("Interest sent")}
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          {tr(
            "You'll be notified if they also express interest. Messaging unlocks on mutual interest.",
          )}
        </p>
      </div>
    );
  }

  // ── No relationship yet → express interest ─────────────────────────
  if (!open) {
    return (
      <div className="bg-cream border border-gold/40 p-6 text-center">
        <div className="w-12 h-12 bg-white border border-gold/40 flex items-center justify-center mx-auto mb-3">
          <Heart className="w-5 h-5 text-gold" strokeWidth={2} />
        </div>
        <div className="text-base font-medium text-navy mb-1">
          {tr("Connect with {name}").replace("{name}", otherName)}
        </div>
        <p className="text-xs text-ink-muted leading-relaxed mb-4">
          {tr("Express interest. If it's mutual, you match and messaging unlocks.")}
        </p>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full px-6 py-4 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
        >
          {tr("Express Interest")} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="bg-white border border-line p-6 space-y-4"
    >
      <input type="hidden" name="toId" value={toId} />
      <div>
        <label
          htmlFor="note"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Personal note (optional)")}
        </label>
        <textarea
          id="note"
          name="note"
          rows={4}
          maxLength={500}
          placeholder={tr(
            "A short intro: who you are, why you connected with their pitch.",
          )}
          className="w-full px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none"
        />
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1 px-6 py-3 border border-line bg-white hover:border-navy text-ink text-sm tracking-wide transition-colors"
        >
          {tr("Cancel")}
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide transition-colors inline-flex items-center justify-center gap-2"
        >
          {isPending ? tr("Sending…") : tr("Send interest")}
          {!isPending && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    </form>
  );
}
