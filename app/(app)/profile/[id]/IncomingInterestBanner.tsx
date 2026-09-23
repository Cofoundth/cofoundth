"use client";

import { useActionState } from "react";
import { Check, Heart } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { Button, Card } from "@/components/ui";
import { expressInterestAction, type InterestState } from "./actions";

// Full-width, high-contrast banner at the top of a profile when this founder
// has expressed interest in YOU. Accepting is the single most important action
// on the page, so it gets a navy bar + gold button — unmissable, not a small
// sidebar control.
export function IncomingInterestBanner({
  toId,
  otherName,
}: {
  toId: string;
  otherName: string;
}) {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<
    InterestState,
    FormData
  >(expressInterestAction, null);

  return (
    <Card
      tone="navy"
      padding="none"
      className="mb-6 border border-gold/50"
    >
      <div className="flex items-center justify-between gap-5 flex-wrap p-6 lg:p-7">
        <div className="flex items-center gap-4 min-w-0">
          <div className="w-12 h-12 bg-gold/15 border border-gold/50 rounded-xl flex items-center justify-center shrink-0">
            <Heart className="w-6 h-6 text-gold" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="text-lg text-white font-medium leading-tight">
              {tr("{name} wants to connect with you").replace(
                "{name}",
                otherName,
              )}
            </div>
            <div className="text-sm text-white/70 mt-0.5">
              {tr("Accept to connect — messaging unlocks for both of you.")}
            </div>
          </div>
        </div>
        <form action={formAction} className="shrink-0">
          <input type="hidden" name="toId" value={toId} />
          {/* variant="accent" + size="lg" IS `px-8 py-4` + the gold face; see
              Button.tsx on why D4's "converge onto inverse" was withdrawn.
              `text-base` because this button set NO font-size and so inherited
              the 16px body — size lg would otherwise drop it to 14px. Measured:
              16px text on a 24px line either way, box 215.19x56.00 to the pixel
              in both locales, resting and hovered.
              ONE deliberate delta: the hand-rolled face used
              `disabled:opacity-60`; the primitive applies `disabled:opacity-50`
              to every button by design (see the header — three opacities in the
              wild converged to one). Visible only during the in-flight submit. */}
          <Button
            type="submit"
            variant="accent"
            size="lg"
            className="text-base"
            disabled={isPending}
          >
            {isPending ? tr("Connecting…") : tr("Accept & connect")}
            {!isPending && <Check className="w-5 h-5" strokeWidth={2.5} />}
          </Button>
        </form>
      </div>
      {state?.error && (
        <div className="px-6 pb-4 -mt-2 text-sm text-danger-line">
          {state.error}
        </div>
      )}
    </Card>
  );
}
