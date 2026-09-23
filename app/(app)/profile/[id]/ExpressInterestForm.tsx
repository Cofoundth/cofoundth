"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, MessageCircle, Heart } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { Button, Card, LinkButton } from "@/components/ui";
import { expressInterestAction, type InterestState } from "./actions";

const INITIAL: InterestState = null;

type Relationship = "none" | "outgoing" | "incoming" | "matched";

type Props = {
  toId: string;
  relationship: Relationship;
  matchId: string | null;
  otherName: string;
  /** Pre-filled note from a ?note= deep link (sanitised + capped server-side
   *  in page.tsx). This is the fallback path for a "Draft intro" link that
   *  lands here instead of sending from the card, so an arriving note also
   *  OPENS the form — a prefilled textarea nobody can see is not a prefill. */
  initialNote?: string;
};

export function ExpressInterestForm({
  toId,
  relationship,
  matchId,
  otherName,
  initialNote,
}: Props) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<InterestState, FormData>(
    expressInterestAction,
    INITIAL,
  );
  const [open, setOpen] = useState(Boolean(initialNote));

  // Accepting an incoming interest creates the match immediately (DB trigger),
  // so confirm the connection rather than showing "interest sent".
  const justConnected = !!state?.ok && relationship === "incoming";

  // ── Connected (matched, or just accepted) ──────────────────────────
  if (relationship === "matched" || justConnected) {
    return (
      <Card className="text-center">
        <div className="w-12 h-12 bg-cream border border-line flex items-center justify-center mx-auto mb-3 rounded-xl">
          <Check className="w-5 h-5 text-gold-ink" strokeWidth={2} />
        </div>
        <div className="text-sm font-medium text-navy mb-1">
          {tr("You're connected")}
        </div>
        <p className="text-xs text-ink-muted leading-relaxed mb-4">
          {tr("Messaging is unlocked — start the conversation.")}
        </p>
        <LinkButton
          href={matchId ? `/messages/${matchId}` : "/matches"}
          fullWidth
        >
          <MessageCircle className="w-4 h-4" />
          {tr("Message {name}").replace("{name}", otherName)}
        </LinkButton>
      </Card>
    );
  }

  // ── Incoming interest → one-click accept ───────────────────────────
  if (relationship === "incoming") {
    return (
      <Card>
        <div className="text-center mb-4">
          <div className="w-12 h-12 bg-cream border border-line flex items-center justify-center mx-auto mb-3 rounded-xl">
            <Heart className="w-5 h-5 text-gold-ink" strokeWidth={2} />
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
          <div className="px-4 py-3 mb-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
            {state.error}
          </div>
        )}
        <form action={formAction}>
          <input type="hidden" name="toId" value={toId} />
          {/* py-4 on the md size rather than size="lg": lg is px-8, and this
              button shipped at px-6. */}
          <Button type="submit" disabled={isPending} fullWidth className="py-4">
            {isPending ? tr("Connecting…") : tr("Accept & connect")}
            {!isPending && <Check className="w-4 h-4" />}
          </Button>
        </form>
      </Card>
    );
  }

  // ── Outgoing interest already sent (waiting) ───────────────────────
  if (relationship === "outgoing" || state?.ok) {
    return (
      <Card className="text-center">
        <div className="w-12 h-12 bg-cream border border-line flex items-center justify-center mx-auto mb-3 rounded-xl">
          <Check className="w-5 h-5 text-gold-ink" strokeWidth={2} />
        </div>
        <div className="text-sm font-medium text-navy mb-1">
          {tr("Interest sent")}
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          {tr(
            "You'll be notified if they also express interest. Messaging unlocks on mutual interest.",
          )}
        </p>
      </Card>
    );
  }

  // ── No relationship yet → express interest ─────────────────────────
  if (!open) {
    return (
      <Card className="text-center">
        <div className="w-12 h-12 bg-cream border border-line flex items-center justify-center mx-auto mb-3 rounded-xl">
          <Heart className="w-5 h-5 text-gold-ink" strokeWidth={2} />
        </div>
        <div className="text-base font-medium text-navy mb-1">
          {tr("Connect with {name}").replace("{name}", otherName)}
        </div>
        <p className="text-xs text-ink-muted leading-relaxed mb-4">
          {tr("Express interest. If it's mutual, you match and messaging unlocks.")}
        </p>
        <Button onClick={() => setOpen(true)} fullWidth className="py-4">
          {tr("Express Interest")} <ArrowRight className="w-4 h-4" />
        </Button>
      </Card>
    );
  }

  return (
    <Card as="form" action={formAction} className="space-y-4">
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
          // defaultValue, not value: the field stays uncontrolled so the note
          // remains editable, and a re-render can never stomp what was typed.
          defaultValue={initialNote}
          placeholder={tr(
            "A short intro: who you are, why you connected with their pitch.",
          )}
          className="w-full px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy resize-none rounded-xl"
        />
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-danger-line bg-danger-surface text-sm text-danger-ink rounded-xl">
          {state.error}
        </div>
      )}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={() => setOpen(false)}
          disabled={isPending}
          className="flex-1"
        >
          {tr("Cancel")}
        </Button>
        <Button
          type="submit"
          disabled={isPending}
          className="flex-1"
        >
          {isPending ? tr("Sending…") : tr("Send interest")}
          {!isPending && <ArrowRight className="w-4 h-4" />}
        </Button>
      </div>
    </Card>
  );
}
