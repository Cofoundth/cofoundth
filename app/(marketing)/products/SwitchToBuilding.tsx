"use client";

// The explorer -> founder affordance, and the ONLY caller of
// upgradeToFounderAction.
//
// ── WHY IT LIVES ON /products ─────────────────────────────────────────────
// /products is EXPLORER_HOME (lib/roles.ts): it is the page an explorer lands
// on every visit, and the shelf is the thing that makes someone want to put
// their own work on it. That is the whole funnel the pivot is built around —
// try what the community builds, get inspired, become a maker — so the control
// belongs at the moment of inspiration, not buried in settings. The Add product
// page (/products/new) shows it too, to an explorer who arrived there.
//
// It REPLACES the "Add yours" link for an explorer rather than sitting beside
// it on the shelf. "Add yours" points at /products/new, whose form an explorer
// cannot use (canPostProduct is false, and createProductAction refuses the
// submit): a link to a page that then says "not you" is a detour, and this
// control is the one thing that changes the answer.
//
// It ENDS on /products/new: upgradeToFounderAction sends them through founder
// onboarding with that page as `next`, so the wizard's finish lands on the form.
//
// ── IT IS A FORM, NOT A LINK ──────────────────────────────────────────────
// The upgrade is a server-side role transition, so it has to be a POST. One
// click, no confirm screen: the transition is strictly one-way (see the action)
// but it costs nothing — it hands over the founder wizard, which is where the
// consequences live and which can be abandoned. A confirm dialog in front of
// "I want to build something" would be friction on the one conversion we want.

import { useActionState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui";
import {
  upgradeToFounderAction,
  type UpgradeToFounderState,
} from "@/app/actions/account-role";

export function SwitchToBuilding({
  label,
  variant = "secondary",
}: {
  /** Already translated by the caller — this file does no i18n. */
  label: string;
  variant?: "primary" | "secondary";
}) {
  const [state, formAction, pending] = useActionState<
    UpgradeToFounderState,
    FormData
  >(upgradeToFounderAction, null);

  return (
    <form action={formAction}>
      {/* type="submit" is load-bearing: components/ui/Button.tsx defaults to
          type="button", so without it this form silently stops submitting. */}
      <Button type="submit" variant={variant} size="sm" disabled={pending}>
        <Rocket className="h-4 w-4" strokeWidth={1.5} />
        {label}
      </Button>
      {/* On success the action redirects to /onboarding (which ends on
          /products/new), so there is no success state to render — only a
          refusal, which only a role the action does not promote can produce. */}
      {state?.error && (
        <p className="mt-2 text-sm text-danger-ink">{state.error}</p>
      )}
    </form>
  );
}
