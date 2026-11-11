"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { canonicalProvince } from "@/lib/provinces";
import { LONG_TEXT_MAX } from "@/lib/limits";
import { ACTIVITIES } from "@/lib/activities";
import { HELP_TOPICS } from "@/lib/help-topics";
import { parseAccountRole, roleHome } from "@/lib/roles";
import { safeNextPath } from "@/lib/safe-next";

export type OnboardingState = { error?: string } | null;

// Role (account_type) is chosen ONCE at signup and is not changeable in-app,
// with ONE narrow exception: upgradeToFounderAction in
// app/actions/account-role.ts promotes an EXPLORER to a founder and then sends
// them here. That edge exists because it is the funnel — someone tries what the
// community builds, gets inspired, and becomes a maker — and it is strictly
// one-way. founder -> explorer, anything -> investor and investor -> anything
// are all refused there, so this is not a general "switch role" action and
// there is still intentionally none in this file.

const ROLE_VALUES = [
  "technical",
  "business",
  "product",
  "marketing",
  "finance",
  "legal",
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

  // This is the FOUNDER onboarding. Any other role belongs somewhere else, and
  // a crafted submit must not write founder fields onto their row — i_am /
  // looking_for / pitch plus `onboarded: true` below, which also trips 0046's
  // set_profile_complete trigger and would make them indistinguishable from a
  // founder to every query that does not pin account_type.
  //
  // The route is not the boundary: a server action is invocable without ever
  // rendering app/onboarding/page.tsx, and /onboarding is outside the (app)
  // group so neither the middleware nor the app layout gates it.
  const { data: prof } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", user.id)
    .maybeSingle();
  const role = parseAccountRole(prof?.account_type);
  // Investor keeps the destination this action has always used — /investor,
  // where their own onboarding form lives — and NOT roleHome("investor"), which
  // is /funding.
  if (role === "investor") redirect("/investor");
  // Every other gated role goes to its own home: explorer -> /products. Written
  // against the home rather than against a list of role names, so a role added
  // later is refused here by default instead of inheriting the founder wizard.
  const home = roleHome(role);
  if (home !== null) redirect(home);

  // Per-item / array caps to prevent malicious clients from writing megabytes
  // into a profile row.
  const MAX_ITEM_LEN = 50;
  const MAX_INDUSTRY = 10; // app surfaces ~15 industries; 10 is a reasonable cap
  const MAX_SKILLS = 30;
  const MAX_LOOKING_FOR = ROLE_VALUES.length; // can't ask for more roles than exist

  const cap = (arr: string[], max: number) =>
    arr.map((s) => s.slice(0, MAX_ITEM_LEN)).slice(0, max);

  // ---- Read form values
  const first_name = String(formData.get("first_name") ?? "")
    .trim()
    .slice(0, 40);
  const last_name = String(formData.get("last_name") ?? "")
    .trim()
    .slice(0, 40);
  const full_name = `${first_name} ${last_name}`.trim();
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
  const location = canonicalProvince(
    String(formData.get("location") ?? "").trim().slice(0, 100),
  );
  const commitment = String(formData.get("commitment") ?? "");
  const runway = String(formData.get("runway") ?? "");
  const experience = String(formData.get("experience") ?? "");
  const pitch = String(formData.get("pitch") ?? "").trim();
  const projectUrlRaw = String(formData.get("project_url") ?? "")
    .trim()
    .slice(0, 300);
  const project_images = formData
    .getAll("project_images")
    .map(String)
    .filter((u) => /^https?:\/\//.test(u))
    .slice(0, 3);
  const why_this = String(formData.get("why_this") ?? "").trim().slice(0, LONG_TEXT_MAX);
  const background = String(formData.get("background") ?? "").trim().slice(0, LONG_TEXT_MAX);
  const work_experience = String(formData.get("work_experience") ?? "")
    .trim()
    .slice(0, LONG_TEXT_MAX);
  const education = String(formData.get("education") ?? "")
    .trim()
    .slice(0, LONG_TEXT_MAX);
  const skills = cap(
    formData
      .getAll("skills")
      .map(String)
      .map((s) => s.trim())
      .filter(Boolean),
    MAX_SKILLS,
  );
  // Controlled vocabularies — whitelisted, not length-capped. cap() slices each
  // item to MAX_ITEM_LEN and several help topics are longer than that, which
  // would store a truncated string no filter could ever match.
  const pickFrom = (values: string[], allowed: readonly string[], max: number) =>
    [...new Set(values.filter((v) => allowed.includes(v)))].slice(0, max);
  const activities = pickFrom(
    formData.getAll("activities").map(String),
    ACTIVITIES,
    20,
  );
  const help_with = pickFrom(
    formData.getAll("help_with").map(String),
    HELP_TOPICS,
    15,
  );
  const needs_help_with = pickFrom(
    formData.getAll("needs_help_with").map(String),
    HELP_TOPICS,
    15,
  );
  const BUILDING_SINCE_VALUES = [
    "under_six_months",
    "six_to_twelve_months",
    "one_to_two_years",
    "two_to_five_years",
    "over_five_years",
  ];
  const rawBuilding = String(formData.get("building_since") ?? "");
  const building_since = BUILDING_SINCE_VALUES.includes(rawBuilding)
    ? rawBuilding
    : null;

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

  // ---- Validate (all fields optional — format-check only; the profile just
  // won't appear in the directory until it's complete, see profile_complete)
  if (i_am.some((r) => !ROLE_VALUES.includes(r as never)))
    return { error: "Invalid role." };
  if (intent.some((x) => !INTENT_VALUES.includes(x as never)))
    return { error: "Invalid intent." };
  if (looking_for.some((r) => !ROLE_VALUES.includes(r as never)))
    return { error: "Invalid 'looking for' role." };
  if (stage && !STAGE_VALUES.includes(stage as never))
    return { error: "Please select a valid stage." };
  if (commitment && !COMMITMENT_VALUES.includes(commitment as never))
    return { error: "Please select a valid commitment level." };
  if (runway && !RUNWAY_VALUES.includes(runway as never))
    return { error: "Please select a valid runway." };
  if (experience && !EXPERIENCE_VALUES.includes(experience as never))
    return { error: "Please select a valid experience level." };
  if (pitch.length > LONG_TEXT_MAX)
    return { error: "About me is too long." };
  if (pitch && /\[[^\]]+\]/.test(pitch))
    return {
      error:
        "Replace the [ ] placeholders with your real details — don't submit the template as-is.",
    };
  if (!PROFILE_TYPES.includes(profile_type as never))
    return { error: "Invalid profile type." };
  if (profile_type === "company" && !company_name)
    return { error: "Company name is required for company profiles." };

  let project_url: string | null = null;
  if (projectUrlRaw) {
    const n = /^https?:\/\//i.test(projectUrlRaw)
      ? projectUrlRaw
      : `https://${projectUrlRaw}`;
    if (!n.includes("."))
      return { error: "That doesn't look like a valid project link." };
    project_url = n;
  }

  // ---- Persist
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      first_name: first_name || null,
      last_name: last_name || null,
      i_am,
      intent,
      looking_for,
      industry,
      stage: stage || null,
      location: location || null,
      commitment: commitment || null,
      runway: runway || null,
      experience: experience || null,
      pitch: pitch || null,
      project_url,
      project_images,
      why_this: why_this || null,
      background: background || null,
      work_experience: work_experience || null,
      education: education || null,
      skills,
      activities,
      help_with,
      needs_help_with,
      building_since,
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

  // Finish where they were heading — the product a sign-up started from — if
  // lib/safe-next.ts accepts the posted `next`. The form field is as forgeable
  // as the URL it came from, so it is checked here, not trusted from the page.
  redirect(safeNextPath(formData.get("next")) ?? "/dashboard");
}
