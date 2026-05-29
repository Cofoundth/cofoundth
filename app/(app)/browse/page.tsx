import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { BrowseClient } from "./BrowseClient";

const PROFILE_COLUMNS =
  "id, slug, full_name, age, location, photo_url, verified, i_am, intent, looking_for, industry, stage, commitment, runway, experience, pitch, why_this, skills, onboarded, type, company_name, capabilities, created_at";

export default async function BrowsePage() {
  const supabase = await createClient();

  const user = await requireUser();

  // Current user's profile (for scoring)
  const { data: me } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", user.id)
    .single();

  // All other onboarded founders
  const { data: others } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("onboarded", true)
    .neq("id", user.id);

  const myReady = !!(
    me &&
    me.i_am &&
    me.intent &&
    Array.isArray(me.looking_for) &&
    me.looking_for.length > 0
  );

  const meAdapted = {
    i_am: me?.i_am ?? null,
    intent: me?.intent ?? null,
    looking_for: me?.looking_for ?? [],
    industry: me?.industry ?? [],
    stage: me?.stage ?? null,
    commitment: me?.commitment ?? null,
    location: me?.location ?? null,
  };

  const othersAdapted = (others ?? []).map((p) => ({
    id: p.id as string,
    slug: (p.slug as string) ?? (p.id as string),
    full_name: (p.full_name as string) ?? "Founder",
    age: (p.age as number | null) ?? null,
    photo_url: (p.photo_url as string | null) ?? null,
    verified: (p.verified as boolean | null) ?? false,
    pitch: (p.pitch as string | null) ?? null,
    skills: (p.skills as string[] | null) ?? [],
    i_am: p.i_am ?? null,
    intent: p.intent ?? null,
    looking_for: p.looking_for ?? [],
    industry: p.industry ?? [],
    stage: p.stage ?? null,
    commitment: p.commitment ?? null,
    location: p.location ?? null,
    type: ((p.type as string) ?? "individual") as "individual" | "company",
    company_name: (p.company_name as string | null) ?? null,
    capabilities: ((p.capabilities ?? []) as string[]) ?? [],
    created_at: (p.created_at as string) ?? new Date(0).toISOString(),
  }));

  return (
    <BrowseClient me={meAdapted} myReady={myReady} others={othersAdapted} />
  );
}
