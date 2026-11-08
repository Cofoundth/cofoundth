"use client";

// The explorer -> founder affordance, and the ONLY caller of
// upgradeToFounderAction.
//
// ── WHY IT LIVES ON /products ─────────────────────────────────────────────
// /products is EXPLORER_HOME (lib/roles.ts): it is the page an explorer lands
// on every visit, and the shelf is the thing that makes someone want to put
// their own work on it. That is the whole funnel the pivot is built around —
// try what the community builds, get inspired, become a maker — so the control
// belongs at the moment of inspiration, not buried in settings.
//
// It REPLACES the "Add yours" link for an explorer rather than sitting beside
// it. "Add yours" points at /community, where the composer does not render for
// them (canPostThread / canPostProduct are both false) and createPostAction
// refuses the submit: a link into a refusal is worse than no link, because it
// reads as a bug rather than as a boundary.
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
      {/* On success the action redirects to /onboarding, so there is no success
          state to render — only a refusal, which only a role the action does
          not promote can produce. */}
      {state?.error && (
        <p className="mt-2 text-sm text-danger-ink">{state.error}</p>
      )}
    </form>
  );
}
