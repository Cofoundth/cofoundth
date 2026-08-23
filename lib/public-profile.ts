// Cofoundee — the ONLY place allowed to read `profiles` for a LOGGED-OUT visitor.
//
// ── PRIVACY CONTRACT (do not weaken any of these) ─────────────────────────
// 1. RLS stays shut. `profiles` has NO anon SELECT policy and must never get
//    one. Reads here go through createAdminClient() (service role), server-side
//    only — these helpers are imported by server components, never by a client
//    component, and the raw row never leaves this module.
// 2. NEVER `select *`. The column list is PUBLIC_PROFILE_COLUMNS below and
//    nothing else. Everything not on it — email, age, linkedin_url,
//    instagram_url, facebook_url, x_url, why_this, skills, looking_for, intent,
//    commitment, runway, experience, background, work_experience, education,
//    project_url, project_images, is_admin, suspended, is_bot, account_type,
//    locale, id, created_at, updated_at — is confidential to members.
// 3. `id` is deliberately absent from PublicProfile: public routes address a
//    founder by `slug`, so the raw UUID never reaches the browser.
// 4. `pitch` is fetched but NEVER returned whole. It leaves this file only as
//    `excerpt` — truncated to EXCERPT_MAX characters (see toExcerpt).
// 5. Investors are invisible: their presence on the platform is confidential,
//    so every query pins account_type = 'founder'.
//
// Anything a logged-out page wants to show MUST be added to PublicProfile here
// (and reviewed) rather than queried at the call site — that is the whole point
// of this module: one allowlist, no drift.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

// The allowlist. `pitch` is present ONLY to build the excerpt; it is stripped
// from the mapped result. `created_at` is intentionally absent — PostgREST can
// order on a column it does not return, so the list ordering costs no exposure.
export const PUBLIC_PROFILE_COLUMNS =
  "slug, full_name, photo_url, i_am, location, verified, industry, stage, pitch";

export type PublicProfile = {
  slug: string;
  fullName: string;
  photoUrl: string | null;
  /** Raw role keys (see ROLE_LABELS in lib/matching) — the UI labels them. */
  roles: string[];
  location: string | null;
  verified: boolean;
  industry: string[];
  stage: string | null;
  /** Truncated pitch. There is NO full-pitch field on this type on purpose. */
  excerpt: string;
};

/** Hard ceiling on the public pitch excerpt, ellipsis included. */
const EXCERPT_MAX = 140;

// Cut on a word boundary where there is one. Thai does not space between words,
// so a Thai pitch legitimately has no break to cut on — fall back to a hard cut
// rather than returning a stub. Either way the result is <= EXCERPT_MAX.
function toExcerpt(pitch: string | null | undefined): string {
  const clean = (pitch ?? "").replace(/\s+/g, " ").trim();
  if (clean.length <= EXCERPT_MAX) return clean;
  const cut = clean.slice(0, EXCERPT_MAX - 1); // leave room for the ellipsis
  const lastSpace = cut.lastIndexOf(" ");
  const head = lastSpace > EXCERPT_MAX * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${head.replace(/[\s.,;:!?–—-]+$/, "")}…`;
}

type ProfileRow = {
  slug: string | null;
  full_name: string | null;
  photo_url: string | null;
  i_am: string[] | null;
  location: string | null;
  verified: boolean | null;
  industry: string[] | null;
  stage: string | null;
  pitch: string | null;
};

function toPublicProfile(row: ProfileRow): PublicProfile {
  return {
    slug: row.slug as string,
    fullName: row.full_name ?? "Founder",
    photoUrl: row.photo_url ?? null,
    roles: row.i_am ?? [],
    location: row.location ?? null,
    verified: row.verified ?? false,
    industry: row.industry ?? [],
    stage: row.stage ?? null,
    excerpt: toExcerpt(row.pitch),
  };
}

// The allowlisted SELECT plus the row filters, in one place so a caller cannot
// accidentally publish a row that should be invisible:
//   profile_complete  — half-finished profiles are not a directory entry
//   suspended = false — moderated accounts disappear from public surfaces
//   is_bot is not true
//   account_type = 'founder' — investors are confidential, never public
//   slug is not null  — public routes address founders by slug only
function publicQuery() {
  return createAdminClient()
    .from("profiles")
    .select(PUBLIC_PROFILE_COLUMNS)
    .eq("profile_complete", true)
    .eq("suspended", false)
    .not("is_bot", "is", true)
    .eq("account_type", "founder")
    .not("slug", "is", null);
}

/**
 * How many founders a visitor can ACTUALLY see, using the identical row filters
 * as listPublicFounders.
 *
 * The landing page and /about used to count `profile_complete AND NOT suspended`
 * directly, which silently included seeded bot profiles — 22 against 19 real
 * ones. Publishing the larger number is inflated social proof, and it also
 * disagreed with the count printed on /founders, which reads this allowlist.
 * One query, one number, everywhere.
 */
export async function countPublicFounders(): Promise<number> {
  const { count } = await createAdminClient()
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("profile_complete", true)
    .eq("suspended", false)
    .not("is_bot", "is", true)
    .eq("account_type", "founder")
    .not("slug", "is", null);
  return count ?? 0;
}

/** Newest-first founders safe to show a logged-out visitor. */
export async function listPublicFounders(limit = 48): Promise<PublicProfile[]> {
  const { data } = await publicQuery()
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as ProfileRow[]).map(toPublicProfile);
}

// One founder by slug, or null when they are not publicly visible.
// Wrapped in React cache() because the profile preview route calls this twice
// per request — once in generateMetadata, once in the page — and both should
// share a single round trip (same idiom as getLocale in lib/i18n-server.ts).
export const getPublicFounder = cache(
  async (slug: string): Promise<PublicProfile | null> => {
    const { data } = await publicQuery().eq("slug", slug).maybeSingle();

    return data ? toPublicProfile(data as ProfileRow) : null;
  },
);
