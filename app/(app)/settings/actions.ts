"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { canonicalProvince } from "@/lib/provinces";

export type EditProfileState = { error?: string; ok?: boolean } | null;

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

const MAX_ITEM_LEN = 50;
const MAX_INDUSTRY = 10;
const MAX_SKILLS = 30;

const cap = (arr: string[], max: number) =>
  arr.map((s) => s.slice(0, MAX_ITEM_LEN)).slice(0, max);

export async function updateProfileAction(
  _prev: EditProfileState,
  formData: FormData,
): Promise<EditProfileState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated. Please sign in again." };

  // ---- Personal
  const first_name = String(formData.get("first_name") ?? "")
    .trim()
    .slice(0, 40);
  const last_name = String(formData.get("last_name") ?? "")
    .trim()
    .slice(0, 40);
  const full_name = `${first_name} ${last_name}`.trim();
  const ageRaw = String(formData.get("age") ?? "").trim();
  const location = canonicalProvince(
    String(formData.get("location") ?? "").trim().slice(0, 100),
  );
  const linkedinRaw = String(formData.get("linkedin_url") ?? "")
    .trim()
    .slice(0, 200);
  const instagramRaw = String(formData.get("instagram_url") ?? "")
    .trim()
    .slice(0, 200);
  const facebookRaw = String(formData.get("facebook_url") ?? "")
    .trim()
    .slice(0, 200);
  const xRaw = String(formData.get("x_url") ?? "").trim().slice(0, 200);

  // ---- Professional
  const i_am = cap(formData.getAll("i_am").map(String), ROLE_VALUES.length);
  const intent = cap(
    formData.getAll("intent").map(String),
    INTENT_VALUES.length,
  );
  const looking_for = cap(
    formData.getAll("looking_for").map(String),
    ROLE_VALUES.length,
  );
  const industry = cap(formData.getAll("industry").map(String), MAX_INDUSTRY);
  const stage = String(formData.get("stage") ?? "");
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

  // ---- B2B
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

  // ---- Validate (all profile fields are optional — format-check only)
  if (full_name.length > 80)
    return { error: "Name is too long (80 characters max)." };

  let age: number | null = null;
  if (ageRaw) {
    const n = Number(ageRaw);
    if (!Number.isInteger(n) || n < 16 || n > 100)
      return { error: "Age must be a whole number between 16 and 100." };
    age = n;
  }

  const normLink = (raw: string): string | { error: string } | null => {
    if (!raw) return null;
    const n = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    if (!n.includes("."))
      return { error: "That doesn't look like a valid link." };
    return n;
  };
  const linkedin = normLink(linkedinRaw);
  if (linkedin && typeof linkedin !== "string") return linkedin;
  const instagram = normLink(instagramRaw);
  if (instagram && typeof instagram !== "string") return instagram;
  const facebook = normLink(facebookRaw);
  if (facebook && typeof facebook !== "string") return facebook;
  const xLink = normLink(xRaw);
  if (xLink && typeof xLink !== "string") return xLink;
  const linkedin_url = (linkedin as string | null) ?? null;
  const instagram_url = (instagram as string | null) ?? null;
  const facebook_url = (facebook as string | null) ?? null;
  const x_url = (xLink as string | null) ?? null;
  const projN = normLink(projectUrlRaw);
  if (projN && typeof projN !== "string") return projN;
  const project_url = (projN as string | null) ?? null;

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
  if (pitch.length > 500)
    return { error: "About me must be 500 characters or less." };
  // Reject unedited pitch templates — they still carry [ ] placeholders.
  if (pitch && /\[[^\]]+\]/.test(pitch))
    return {
      error:
        "Replace the [ ] placeholders with your real details — don't submit the template as-is.",
    };
  if (!PROFILE_TYPES.includes(profile_type as never))
    return { error: "Invalid profile type." };
  if (profile_type === "company" && !company_name)
    return { error: "Company name is required for company profiles." };

  // ---- Persist (RLS restricts to own row; .eq is belt-and-suspenders)
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      first_name: first_name || null,
      last_name: last_name || null,
      age,
      location: location || null,
      linkedin_url,
      instagram_url,
      facebook_url,
      x_url,
      i_am,
      intent,
      looking_for,
      industry,
      stage: stage || null,
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
      type: profile_type,
      company_name: profile_type === "company" ? company_name : null,
      capabilities: profile_type === "company" ? capabilities : [],
      partnership_seeking:
        profile_type === "company" ? partnership_seeking : [],
      status_tags,
      // A complete, validated save through the editor also completes
      // onboarding — so /settings works as a standalone path to a finished
      // profile, fully separate from the wizard.
      onboarded: true,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath(`/profile/${user.id}`);
  revalidatePath("/dashboard");
  return { ok: true };
}

export type PasswordState = { error?: string; ok?: boolean } | null;

// Set / change the account password. For Google sign-ups this adds the ability
// to ALSO sign in with email + password (Supabase keeps the existing OAuth
// identity and attaches a password credential to the same user).
export async function setPasswordAction(
  _prev: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (password.length < 8)
    return { error: "Password must be at least 8 characters." };
  if (password.length > 72)
    return { error: "Password must be 72 characters or less." };
  if (password !== confirm) return { error: "Passwords don't match." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated. Please sign in again." };

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: error.message };
  return { ok: true };
}
