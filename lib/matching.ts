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
