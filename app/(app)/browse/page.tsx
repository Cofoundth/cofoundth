import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { BrowseClient } from "./BrowseClient";

const PROFILE_COLUMNS =
  "id, slug, full_name, age, location, photo_url, verified, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, why_this, skills, project_url, project_images, work_experience, background, education, activities, help_with, needs_help_with, building_since, onboarded, type, company_name, capabilities, created_at";

export default async function BrowsePage() {
  const supabase = await createClient();

  const user = await requireUser();

  // All other onboarded founders
  // Only complete profiles (name + role + looking-for + About me) appear in the
  // directory — see the profile_complete trigger (migration 0046).
  // The viewer's own matching axes (for the matchmaker's Complement Score),
  // who they already reached out to (so the card button shows the state), and
  // who they saved (the heart).
  const [{ data: me }, { data: sentRows }, { data: saveRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("i_am, intent, looking_for, industry, stage, commitment, location")
        .eq("id", user.id)
        .single(),
      supabase
        .from("interests")
        .select("to_profile_id")
        .eq("from_profile_id", user.id),
      supabase
        .from("profile_saves")
        .select("profile_id")
        .eq("user_id", user.id),
    ]);

  const { data: others } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("profile_complete", true)
    .eq("suspended", false)
    // Same row filters as lib/public-profile.ts: investors are confidential
    // (an investor who completes their profile must NOT surface here), and
    // bot/seed rows are excluded from every directory, not just the public one.
    .eq("account_type", "founder")
    .not("is_bot", "is", true)
    .neq("id", user.id);

  const othersAdapted = (others ?? []).map((p) => ({
    id: p.id as string,
    slug: (p.slug as string) ?? (p.id as string),
    full_name: (p.full_name as string) ?? "Founder",
    age: (p.age as number | null) ?? null,
    photo_url: (p.photo_url as string | null) ?? null,
    verified: (p.verified as boolean | null) ?? false,
    pitch: (p.pitch as string | null) ?? null,
    skills: (p.skills as string[] | null) ?? [],
    project_url: (p.project_url as string | null) ?? null,
    project_images: ((p.project_images ?? []) as string[]) ?? [],
    work_experience: (p.work_experience as string | null) ?? null,
    background: (p.background as string | null) ?? null,
    education: (p.education as string | null) ?? null,
    i_am: p.i_am ?? [],
    intent: p.intent ?? [],
    looking_for: p.looking_for ?? [],
    industry: p.industry ?? [],
    stage: p.stage ?? null,
    commitment: p.commitment ?? null,
    location: p.location ?? null,
    type: ((p.type as string) ?? "individual") as "individual" | "company",
    company_name: (p.company_name as string | null) ?? null,
    capabilities: ((p.capabilities ?? []) as string[]) ?? [],
    activities: ((p.activities ?? []) as string[]) ?? [],
    help_with: ((p.help_with ?? []) as string[]) ?? [],
    needs_help_with: ((p.needs_help_with ?? []) as string[]) ?? [],
    building_since: (p.building_since as string | null) ?? null,
    created_at: (p.created_at as string) ?? new Date(0).toISOString(),
  }));

  return (
    <BrowseClient
      others={othersAdapted}
      viewer={{
        i_am: (me?.i_am as string[] | null) ?? [],
        intent: (me?.intent as string[] | null) ?? [],
        looking_for: (me?.looking_for as string[] | null) ?? [],
        industry: (me?.industry as string[] | null) ?? [],
        stage: (me?.stage as string | null) ?? null,
        commitment: (me?.commitment as string | null) ?? null,
        location: (me?.location as string | null) ?? null,
      }}
      sentTo={(sentRows ?? []).map((r) => r.to_profile_id as string)}
      savedIds={(saveRows ?? []).map((r) => r.profile_id as string)}
    />
  );
}
