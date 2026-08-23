"use client";

import { AvatarUploader } from "@/components/AvatarUploader";
import { OnboardingForm } from "./OnboardingForm";
import {
  InvestorOnboardingForm,
  type InvestorInitial,
} from "@/app/(app)/investor/InvestorOnboardingForm";
import { useT } from "@/lib/i18n-client";

type FounderInitial = React.ComponentProps<typeof OnboardingForm>["initial"];

// Renders the onboarding for the account's role. The role is chosen ONCE at
// signup (account_type) and is NOT switchable here — one account = one role.
// To use the other side, sign up with a separate account.
export function OnboardingRoleSwitch({
  initialRole,
  founderInitial,
  investorInitial,
  userId,
  photoUrl,
  userName,
}: {
  initialRole: "founder" | "investor";
  founderInitial: FounderInitial;
  investorInitial?: InvestorInitial;
  userId: string;
  photoUrl: string | null;
  userName: string | null;
}) {
  const tr = useT();

  if (initialRole === "investor") {
    return (
      <div className="max-w-2xl mx-auto px-6 lg:px-10 py-[88px]">
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
      <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-[88px]">
        <div className="bg-white border border-line p-6 lg:p-8 mb-6 rounded-xl">
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
            {tr("Profile photo")}
          </div>
          <AvatarUploader userId={userId} initialUrl={photoUrl} name={userName} />
        </div>
      </div>
      <OnboardingForm initial={founderInitial} />
    </>
  );
}
