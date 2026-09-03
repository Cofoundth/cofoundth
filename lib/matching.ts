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
