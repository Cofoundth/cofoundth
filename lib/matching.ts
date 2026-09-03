// Cofoundee — profile label maps + shared profile shape.

export type ProfileLike = {
  id?: string;
  i_am: string[];
  intent: string[];
  looking_for: string[];
  industry: string[];
  stage: string | null;
  commitment: string | null;
  location: string | null;
};

// Friendly labels ----------------------------------------------------

export const ROLE_LABELS: Record<string, string> = {
  technical: "Technical",
  business: "Business",
  product: "Product",
  marketing: "Marketing",
  finance: "Finance",
  legal: "Legal",
};

export const INTENT_LABELS: Record<string, string> = {
  idea: "Has an idea",
  open: "Open to ideas",
  explore: "Exploring",
};

export const STAGE_LABELS: Record<string, string> = {
  exploring: "Exploring",
  building: "Building MVP",
  traction: "Have traction",
  raising: "Raising",
};

export const COMMITMENT_LABELS: Record<string, string> = {
  full_time: "Full-time",
  part_time: "Part-time",
  side_project: "Side project",
};

export const RUNWAY_LABELS: Record<string, string> = {
  three_months: "3 months",
  six_months: "6 months",
  twelve_months: "12 months",
  eighteen_plus: "18+ months",
};

// How long in the CURRENT venture. Distinct from EXPERIENCE_LABELS, which
// counts how many ventures someone has had — a second-time founder six weeks in
// and a first-timer five years in are opposites here and identical there.
export const BUILDING_SINCE_LABELS: Record<string, string> = {
  under_six_months: "Under 6 months",
  six_to_twelve_months: "6–12 months",
  one_to_two_years: "1–2 years",
  two_to_five_years: "2–5 years",
  over_five_years: "5+ years",
};

// Age is stored as an integer, so the bands are a presentation concern only —
// no column, no migration. Bounds are inclusive on both ends.
export const AGE_BANDS: { key: string; label: string; min: number; max: number }[] =
  [
    { key: "18_24", label: "18–24", min: 18, max: 24 },
    { key: "25_30", label: "25–30", min: 25, max: 30 },
    { key: "31_35", label: "31–35", min: 31, max: 35 },
    { key: "36_40", label: "36–40", min: 36, max: 40 },
    { key: "41_50", label: "41–50", min: 41, max: 50 },
    { key: "51_plus", label: "50+", min: 51, max: 200 },
  ];

export const EXPERIENCE_LABELS: Record<string, string> = {
  first_time: "First-time founder",
  one_to_two: "1–2 ventures",
  three_plus: "3+ ventures",
};

// ── COMPLEMENT SCORE ──────────────────────────────────────────────────────
// The weighting CLAUDE.md has specified since the pivot, and that /terms
// already promises to users ("based on complementary skills, intent, and
// industry") — but which existed nowhere in the code until now. The matching
// surfaces filtered; nothing ranked.
//
//   role 40 / intent 30 / industry 15 / stage 10 / location+commitment 5
//
// COMPLEMENT, not similarity, and the two pull in opposite directions on the
// first two axes: you want someone who IS what you are looking for, and whose
// intent fits yours rather than repeats it. Two people who both have an idea
// and both want a technical co-founder are a poor pair, however alike they
// look. Industry, stage and location are the axes where sameness IS the
// signal, so those score on overlap.
//
// Pure and dependency-free so it can run on the server, in a client filter, or
// in a test without a database.

/** Intent pairs that complement rather than duplicate. */
const INTENT_FIT: Record<string, Record<string, number>> = {
  // someone with an idea wants people who want in on one
  idea: { open: 1, explore: 0.75, idea: 0.15 },
  // open to ideas — best paired with someone who has one
  open: { idea: 1, explore: 0.4, open: 0.3 },
  // still exploring — an idea-haver gives them something to join
  explore: { idea: 0.75, open: 0.4, explore: 0.3 },
};

function overlap(a: string[] | null, b: string[] | null): number {
  const A = a ?? [];
  const B = b ?? [];
  if (A.length === 0 || B.length === 0) return 0;
  const hits = A.filter((x) => B.includes(x)).length;
  return hits / Math.min(A.length, B.length);
}

export type ComplementBreakdown = {
  role: number;
  intent: number;
  industry: number;
  stage: number;
  context: number;
};

/**
 * 0–100. `me` is the viewer, `them` the candidate.
 *
 * Asymmetric on purpose: score(me, them) answers "how well do they fit what I
 * asked for", which is not the same question as score(them, me).
 */
export function complementScore(
  me: ProfileLike,
  them: ProfileLike,
): { score: number; breakdown: ComplementBreakdown } {
  // ROLE 40 — what fraction of the roles I asked for do they actually hold.
  // Divided by what I ASKED for, not by the smaller set: wanting two roles and
  // getting one is half a match, and a generalist who ticks every box should
  // not outrank the specialist I actually need.
  const wanted = me.looking_for ?? [];
  const theirRoles = them.i_am ?? [];
  const role =
    wanted.length === 0
      ? 0
      : wanted.filter((r) => theirRoles.includes(r)).length / wanted.length;

  // INTENT 30 — fit, not sameness (see INTENT_FIT).
  const myIntents = me.intent ?? [];
  const theirIntents = them.intent ?? [];
  let intent = 0;
  for (const a of myIntents) {
    for (const b of theirIntents) {
      intent = Math.max(intent, INTENT_FIT[a]?.[b] ?? 0);
    }
  }

  // INDUSTRY 15 / STAGE 10 / CONTEXT 5 — here sameness is the signal.
  const industry = overlap(me.industry, them.industry);
  const stage = me.stage && them.stage && me.stage === them.stage ? 1 : 0;
  const samePlace = !!me.location && me.location === them.location;
  const samePace = !!me.commitment && me.commitment === them.commitment;
  const context = (Number(samePlace) + Number(samePace)) / 2;

  const breakdown = { role, intent, industry, stage, context };
  const score =
    role * 40 + intent * 30 + industry * 15 + stage * 10 + context * 5;

  return { score: Math.round(score), breakdown };
}
