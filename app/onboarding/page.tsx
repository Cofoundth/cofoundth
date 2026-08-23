import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { tServer } from "@/lib/i18n-server";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { BrandMark, Wordmark } from "@/components/Brand";
import { signOutAction } from "../(auth)/actions";
import { OnboardingRoleSwitch } from "./OnboardingRoleSwitch";
import type { InvestorInitial } from "@/app/(app)/investor/InvestorOnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, first_name, last_name, photo_url, type, account_type, company_name, capabilities, partnership_seeking, status_tags, i_am, intent, looking_for, industry, stage, location, commitment, runway, experience, pitch, why_this, background, work_experience, education, skills",
    )
    .eq("id", user.id)
    .single();

  const { data: inv } = await supabase
    .from("investor_profiles")
    .select(
      "investor_type, firm_name, focus_industries, stages, ticket_size, thesis, location",
    )
    .eq("user_id", user.id)
    .maybeSingle();

  const initialRole: "founder" | "investor" =
    profile?.account_type === "investor" ? "investor" : "founder";

  const founderInitial = profile
    ? {
        first_name: (profile.first_name as string | null) ?? "",
        last_name: (profile.last_name as string | null) ?? "",
        profile_type: ((profile.type as string) ?? "individual") as
          | "individual"
          | "company",
        company_name: (profile.company_name as string | null) ?? "",
        capabilities: ((profile.capabilities ?? []) as string[]).join(", "),
        partnership_seeking: (
          (profile.partnership_seeking ?? []) as string[]
        ).join(", "),
        status_tags: (profile.status_tags ?? []) as Array<
          | "open_to_partnerships"
          | "open_to_cofounder"
          | "hiring"
          | "raising"
          | "looking_for_advisors"
        >,
        i_am: profile.i_am ?? [],
        intent: profile.intent ?? [],
        looking_for: profile.looking_for ?? [],
        industry: profile.industry ?? [],
        stage: profile.stage ?? "",
        location: profile.location ?? "",
        commitment: profile.commitment ?? "",
        runway: profile.runway ?? "",
        experience: profile.experience ?? "",
        pitch: profile.pitch ?? "",
        why_this: profile.why_this ?? "",
        background: (profile.background as string | null) ?? "",
        work_experience: (profile.work_experience as string | null) ?? "",
        education: (profile.education as string | null) ?? "",
        skills: (profile.skills as string[] | null) ?? [],
      }
    : {};

  return (
    <>
      <header className="bg-white border-b border-line">
        <div className="max-w-3xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" />
            <Wordmark className="text-base" />
          </div>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            <form action={signOutAction}>
              <button
                type="submit"
                className="text-sm text-ink-muted hover:text-navy tracking-wide"
              >
                {await tServer("Sign out")}
              </button>
            </form>
          </div>
        </div>
      </header>

      <OnboardingRoleSwitch
        initialRole={initialRole}
        founderInitial={founderInitial}
        investorInitial={(inv as InvestorInitial | null) ?? undefined}
        userId={user.id}
        photoUrl={profile?.photo_url ?? null}
        userName={profile?.full_name ?? user.email ?? null}
      />
    </>
  );
}
