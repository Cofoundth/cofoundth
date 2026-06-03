"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string } | null;

const ROLE_VALUES = [
  "technical",
  "business",
  "product",
  "marketing",
  "finance",
  "domain_expert",
] as const;
const INTENT_VALUES = ["idea", "open", "explore"] as const;
const STAGE_VALUES = ["exploring", "building", "traction", "raising"] as const;
const COMMITMENT_VALUES = ["full_time", "part_time", "side_project"] as const;
const RUNWAY_VALUES = [
  "three_months",
  "six_months",
  "twelve_months",
  "eighteen_plus",
] as const;
const EXPERIENCE_VALUES = ["first_time", "one_to_two", "three_plus"] as const;
const PROFILE_TYPES = ["individual", "company"] as const;
const STATUS_TAGS = [
  "open_to_partnerships",
  "open_to_cofounder",
  "hiring",
  "raising",
  "looking_for_advisors",
] as const;

export async function saveOnboardingAction(
  _prev: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated. Please sign in again." };

  // Per-item / array caps to prevent malicious clients from writing megabytes
  // into a profile row.
  const MAX_ITEM_LEN = 50;
  const MAX_INDUSTRY = 10; // app surfaces ~15 industries; 10 is a reasonable cap
  const MAX_SKILLS = 30;
  const MAX_LOOKING_FOR = ROLE_VALUES.length; // can't ask for more roles than exist

  const cap = (arr: string[], max: number) =>
    arr.map((s) => s.slice(0, MAX_ITEM_LEN)).slice(0, max);

  // ---- Read form values
  const full_name = String(formData.get("full_name") ?? "").trim().slice(0, 80);
  const i_am = cap(formData.getAll("i_am").map(String), ROLE_VALUES.length);
  const intent = cap(
    formData.getAll("intent").map(String),
    INTENT_VALUES.length,
  );
  const looking_for = cap(
    formData.getAll("looking_for").map(String),
    MAX_LOOKING_FOR,
  );
  const industry = cap(formData.getAll("industry").map(String), MAX_INDUSTRY);
  const stage = String(formData.get("stage") ?? "");
  const location = String(formData.get("location") ?? "").trim().slice(0, 100);
  const commitment = String(formData.get("commitment") ?? "");
  const runway = String(formData.get("runway") ?? "");
  const experience = String(formData.get("experience") ?? "");
  const pitch = String(formData.get("pitch") ?? "").trim();
  const why_this = String(formData.get("why_this") ?? "").trim().slice(0, 1000);
  const background = String(formData.get("background") ?? "").trim().slice(0, 600);
  const work_experience = String(formData.get("work_experience") ?? "")
    .trim()
    .slice(0, 800);
  const education = String(formData.get("education") ?? "")
    .trim()
    .slice(0, 400);
  const skills = cap(
    formData
      .getAll("skills")
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean),
    MAX_SKILLS,
  );

  // B2B fields (Phase 4 brought forward — see CLAUDE.md for original plan)
  const profile_type =
    String(formData.get("profile_type") ?? "individual") || "individual";
  const company_name = String(formData.get("company_name") ?? "")
    .trim()
    .slice(0, 100);
  const capabilities = cap(
    formData.getAll("capabilities").map(String),
    MAX_INDUSTRY,
  );
  const partnership_seeking = cap(
    formData.getAll("partnership_seeking").map(String),
    10,
  );
  const status_tags = formData
    .getAll("status_tags")
    .map(String)
    .filter((t) => (STATUS_TAGS as readonly string[]).includes(t))
    .slice(0, 5);

  // ---- Validate
  if (full_name.length < 2) return { error: "Please enter your name." };
  if (i_am.length === 0) return { error: "Please select your role." };
  if (i_am.some((r) => !ROLE_VALUES.includes(r as never)))
    return { error: "Invalid role." };
  if (intent.length === 0)
    return { error: "Please tell us what you're bringing." };
  if (intent.some((x) => !INTENT_VALUES.includes(x as never)))
    return { error: "Invalid intent." };
  if (looking_for.length === 0)
    return { error: "Please select at least one role you're looking for." };
  if (looking_for.some((r) => !ROLE_VALUES.includes(r as never)))
    return { error: "Invalid 'looking for' role." };
  if (industry.length === 0)
    return { error: "Please select at least one industry." };
  if (!STAGE_VALUES.includes(stage as never))
    return { error: "Please select your stage." };
  if (!COMMITMENT_VALUES.includes(commitment as never))
    return { error: "Please select your commitment level." };
  // runway is optional (see OnboardingForm + step 3 "(optional)" label).
  // Only validate when the user actually picked something.
  if (runway && !RUNWAY_VALUES.includes(runway as never))
    return { error: "Please select a valid runway." };
  if (!EXPERIENCE_VALUES.includes(experience as never))
    return { error: "Please select your founder experience." };
  if (pitch.length < 120)
    return { error: "Your pitch must be at least 120 characters." };
  if (pitch.length > 500)
    return { error: "Your pitch must be 500 characters or less." };
  if (!PROFILE_TYPES.includes(profile_type as never))
    return { error: "Invalid profile type." };
  if (profile_type === "company" && !company_name)
    return { error: "Company name is required for company profiles." };

  // ---- Persist
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      i_am,
      intent,
      looking_for,
      industry,
      stage,
      location: location || null,
      commitment,
      runway: runway || null,
      experience,
      pitch,
      why_this: why_this || null,
      background: background || null,
      work_experience: work_experience || null,
      education: education || null,
      skills,
      type: profile_type,
      company_name: profile_type === "company" ? company_name : null,
      capabilities: profile_type === "company" ? capabilities : [],
      partnership_seeking:
        profile_type === "company" ? partnership_seeking : [],
      status_tags,
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  redirect("/dashboard");
}
