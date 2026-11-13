"use client";

import { AvatarUploader } from "@/components/AvatarUploader";
import { OnboardingForm } from "./OnboardingForm";
import {
  InvestorOnboardingForm,
  type InvestorInitial,
} from "@/app/(app)/investor/InvestorOnboardingForm";
import { useT } from "@/lib/i18n-client";
import type { AccountRole } from "@/lib/roles";

type FounderInitial = React.ComponentProps<typeof OnboardingForm>["initial"];

// Renders the onboarding for the account's role. The role is chosen ONCE at
// signup (account_type) and is NOT switchable here.
//
// ONE EXCEPTION, and only one: upgradeToFounderAction in
// app/actions/account-role.ts turns an EXPLORER into a founder — someone who
// came to try what the community builds, and then built something. It is the
// funnel, it is one-way, and it is the reason this file no longer says the role
// can never change. Every other transition is refused: founder -> explorer,
// anything -> investor, investor -> anything. To use the investor side, sign up
// with a separate account.
//
// `initialRole` is the account's real role, all three values of it — the prop
// used to be typed "founder" | "investor", which asserted a binary the DB no
// longer has. Only two of the three render a form here; see the explorer branch.
export function OnboardingRoleSwitch({
  initialRole,
  founderInitial,
  investorInitial,
  userId,
  photoUrl,
  userName,
  destination,
}: {
  initialRole: AccountRole;
  founderInitial: FounderInitial;
  investorInitial?: InvestorInitial;
  userId: string;
  photoUrl: string | null;
  userName: string | null;
  /**
   * Where the founder form sends them once it is saved (the page's checked
   * `?next=`). Founder only: the investor form keeps its own /investor finish.
   */
  destination?: string;
}) {
  const tr = useT();

  // Unreachable: app/onboarding/page.tsx redirects an explorer to their home
  // before this renders. Kept as a dead end rather than letting them fall
  // through to the founder wizard — which is what the old two-way branch did,
  // and submitting it writes founder fields onto a row that should not have
  // them. Nothing-but-unreachable beats wrong-and-reachable.
  if (initialRole === "explorer") return null;

  if (initialRole === "investor") {
    return (
      <div className="max-w-2xl mx-auto px-6 lg:px-10 py-14">
        <p className="text-ink-muted leading-relaxed mb-6">
          {tr(
            "Tell us how you invest. This is separate from the founder profile — no company or co-founder details needed.",
          )}
        </p>
        <div className="bg-white border border-line p-6 lg:p-8 rounded-xl">
          <InvestorOnboardingForm initial={investorInitial} />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-14">
        <div className="bg-white border border-line p-6 lg:p-8 mb-6 rounded-xl">
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
            {tr("Profile photo")}
          </div>
          <AvatarUploader userId={userId} initialUrl={photoUrl} name={userName} />
        </div>
      </div>
      <OnboardingForm initial={founderInitial} destination={destination} />
    </>
  );
}
