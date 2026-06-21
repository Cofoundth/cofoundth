"use client";

import { useState, useTransition } from "react";
import { AvatarUploader } from "@/components/AvatarUploader";
import { OnboardingForm } from "./OnboardingForm";
import {
  InvestorOnboardingForm,
  type InvestorInitial,
} from "../investor/InvestorOnboardingForm";
import { setOnboardingRoleAction } from "./actions";
import { useT } from "@/lib/i18n-client";

const ROLES = [
  { value: "founder", en: "Founder / Company", hint: "Build & find partners" },
  { value: "investor", en: "Investor", hint: "Back startups · early access" },
] as const;

type FounderInitial = React.ComponentProps<typeof OnboardingForm>["initial"];

// The onboarding entry point. Choose a role; the matching fields render right
// here — founders never see investor fields, investors never see the
// founder/company form.
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
  const [role, setRole] = useState<"founder" | "investor">(initialRole);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function pick(next: "founder" | "investor") {
    if (next === role || pending) return;
    const prev = role;
    setRole(next); // optimistic
    setError(null);
    start(async () => {
      const res = await setOnboardingRoleAction(next);
      if (res?.error) {
        setRole(prev); // roll back on failure so the UI matches the DB
        setError(res.error);
      }
    });
  }

  return (
    <div>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-10">
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
          {tr("I'm joining as")}
        </label>
        <div className="grid grid-cols-2 gap-3 mb-2">
          {ROLES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => pick(r.value)}
              aria-pressed={role === r.value}
              disabled={pending}
              className={`text-left p-3 border transition-colors disabled:opacity-60 ${
                role === r.value
                  ? "bg-cream border-navy"
                  : "bg-white border-line hover:border-navy"
              }`}
            >
              <div className="text-sm text-navy font-medium">{tr(r.en)}</div>
              <div className="text-xs text-ink-muted mt-0.5">{tr(r.hint)}</div>
            </button>
          ))}
        </div>
        {error && (
          <p className="text-xs text-red-700 mb-2">{tr(error)}</p>
        )}
      </div>

      {role === "founder" ? (
        <>
          <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-6">
            <div className="bg-white border border-line p-6 lg:p-8 mb-6">
              <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
                {tr("Profile photo")}
              </div>
              <AvatarUploader
                userId={userId}
                initialUrl={photoUrl}
                name={userName}
              />
            </div>
          </div>
          <OnboardingForm initial={founderInitial} />
        </>
      ) : (
        <div className="max-w-2xl mx-auto px-6 lg:px-10 pt-6">
          <p className="text-ink-muted leading-relaxed mb-6">
            {tr(
              "Tell us how you invest. This is separate from the founder profile — no company or co-founder details needed.",
            )}
          </p>
          <div className="bg-white border border-line p-6 lg:p-8">
            <InvestorOnboardingForm initial={investorInitial} />
          </div>
        </div>
      )}
    </div>
  );
}
