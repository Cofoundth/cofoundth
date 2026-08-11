// Investor type slugs — the values stored in investor_profiles.investor_type.
// One label map shared by the onboarding dropdown and every display surface, so
// a raw slug ("family_office") never leaks into the UI. Labels are English keys
// for t()/tServer(); insertion order is the dropdown order.
export const INVESTOR_TYPE_LABELS: Record<string, string> = {
  angel: "Angel",
  vc: "VC fund",
  corporate: "Corporate VC",
  family_office: "Family office",
  syndicate: "Syndicate",
  other: "Other",
};

export const INVESTOR_TYPES: { value: string; en: string }[] = Object.entries(
  INVESTOR_TYPE_LABELS,
).map(([value, en]) => ({ value, en }));

// Unknown/legacy slugs fall through to themselves rather than rendering blank.
export function investorTypeLabel(slug: string | null | undefined): string {
  if (!slug) return "";
  return INVESTOR_TYPE_LABELS[slug] ?? slug;
}
