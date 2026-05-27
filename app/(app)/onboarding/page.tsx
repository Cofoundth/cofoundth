import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./OnboardingForm";
import { AvatarUploader } from "@/components/AvatarUploader";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, photo_url, type, company_name, capabilities, partnership_seeking, i_am, intent, looking_for, industry, stage, location, commitment, runway, experience, pitch, why_this, skills",
    )
    .eq("id", user.id)
    .single();

  const initial = profile
    ? {
        profile_type: ((profile.type as string) ?? "individual") as
          | "individual"
          | "company",
        company_name: (profile.company_name as string | null) ?? "",
        capabilities: ((profile.capabilities ?? []) as string[]).join(", "),
        partnership_seeking: (
          (profile.partnership_seeking ?? []) as string[]
        ).join(", "),
        i_am: profile.i_am ?? "",
        intent: profile.intent ?? "",
        looking_for: profile.looking_for ?? [],
        industry: profile.industry ?? [],
        stage: profile.stage ?? "",
        location: profile.location ?? "",
        commitment: profile.commitment ?? "",
        runway: profile.runway ?? "",
        experience: profile.experience ?? "",
        pitch: profile.pitch ?? "",
        why_this: profile.why_this ?? "",
        skills: (profile.skills ?? []).join(", "),
      }
    : {};

  const initialChar = (profile?.full_name ?? user.email ?? "?")
    .toString()
    .trim()
    .charAt(0)
    .toUpperCase();

  return (
    <>
      <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-10">
        <div className="bg-white border border-line p-6 lg:p-8 mb-6">
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
            Profile photo
          </div>
          <AvatarUploader
            userId={user.id}
            initialUrl={profile?.photo_url ?? null}
            initial={initialChar}
          />
        </div>
      </div>
      <OnboardingForm initial={initial} />
    </>
  );
}
