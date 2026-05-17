// Cofoundee — Complement Score
//
// Per CLAUDE.md weights:
//   Role complementarity (40%) + Intent alignment (30%) + Industry (15%) +
//   Stage (10%) + Location/commitment (5%)

export type ProfileLike = {
  id?: string;
  i_am: string | null;
  intent: string | null;
  looking_for: string[];
  industry: string[];
  stage: string | null;
  commitment: string | null;
  location: string | null;
};

const STAGE_ORDER = ["exploring", "building", "traction", "raising"];

export function complementScore(me: ProfileLike, other: ProfileLike): number {
  if (!me.i_am || !me.intent) return 0;

  let score = 0;

  // 1. Role complementarity (40%)
  const otherInMyLookingFor =
    other.i_am && me.looking_for.includes(other.i_am);
  const meInOtherLookingFor = other.looking_for.includes(me.i_am);
  if (otherInMyLookingFor && meInOtherLookingFor) score += 40;
  else if (otherInMyLookingFor || meInOtherLookingFor) score += 20;

  // 2. Intent alignment (30%)
  // Idea + Open is the canonical complementary pair.
  // Explore pairs well with anyone (open to exploration).
  if (
    (me.intent === "idea" && other.intent === "open") ||
    (me.intent === "open" && other.intent === "idea")
  ) {
    score += 30;
  } else if (me.intent === "explore" || other.intent === "explore") {
    score += 18;
  } else if (me.intent === other.intent) {
    score += 12;
  }

  // 3. Industry overlap (15%)
  const overlap = me.industry.filter((i) => other.industry.includes(i));
  if (overlap.length > 0) {
    score += Math.min(15, 8 + overlap.length * 3);
  }

  // 4. Stage proximity (10%)
  if (me.stage && other.stage) {
    const a = STAGE_ORDER.indexOf(me.stage);
    const b = STAGE_ORDER.indexOf(other.stage);
    const diff = Math.abs(a - b);
    if (diff === 0) score += 10;
    else if (diff === 1) score += 6;
    else if (diff === 2) score += 3;
  }

  // 5. Location + commitment (5%)
  if (me.commitment && me.commitment === other.commitment) score += 3;
  if (
    (me.location && me.location === other.location) ||
    (me.location && /remote/i.test(me.location)) ||
    (other.location && /remote/i.test(other.location))
  ) {
    score += 2;
  }

  return Math.round(score);
}

// Friendly labels ----------------------------------------------------

export const ROLE_LABELS: Record<string, string> = {
  technical: "Technical",
  business: "Business",
  product: "Product",
  marketing: "Marketing",
  finance: "Finance",
  domain_expert: "Domain Expert",
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

export const EXPERIENCE_LABELS: Record<string, string> = {
  first_time: "First-time founder",
  one_to_two: "1–2 ventures",
  three_plus: "3+ ventures",
};
