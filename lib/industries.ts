// Cofoundee — the industry taxonomy.
//
// Widened from 31 tech verticals to the real economy when the platform's
// positioning changed from "Thai tech startups" to "anyone in Thailand building
// a business". A Muay Thai gym, a jewellery exporter in Chanthaburi, a cafe
// chain in Chiang Mai and a SaaS founder all have to find themselves here.
//
// Rules this list follows, so it stays coherent as it grows:
//   - Name the TRADE, not the technology. "Education", not "EdTech";
//     "Healthcare", not "HealthTech". A tutoring school and a learning app are
//     the same industry with different delivery. The -Tech suffix only survives
//     where the tech IS the trade (FinTech).
//   - One label per concept. Never ship two labels a user could not choose
//     between.
//   - Alphabetical. The picker is a searchable combobox, so alphabetical is
//     what someone scanning or typing expects.
//   - No "Other" entry. Both profile forms already render a free-text
//     "Other — type and press Enter" box under the picker; a literal "Other"
//     chip would be a second control with the same name, and it is strictly
//     worse — typed text gives us a real segment, "Other" gives us nothing and
//     then shows up as a meaningless badge on the browse card.
//
// These labels render in ENGLISH in both the Thai and English UI, so they stay
// short and legible to a Thai reader. Renaming any string here ORPHANS the
// stored value in profiles.industry (text[] of labels) — see migration 0060,
// which remaps the old strings. Rename via a migration or not at all.
export const INDUSTRIES: string[] = [
  "Accounting & Finance", "Agriculture & Fisheries", "AI",
  "Architecture & Interiors", "Art & Photography", "Automotive & Mobility",
  "Beauty & Cosmetics", "Biotech & Pharma", "Construction", "Consulting",
  "Consumer Goods", "Creator & Influencer", "Crypto & Web3",
  "Cybersecurity", "Design & Creative", "E-commerce", "Education",
  "Electronics & Hardware", "Energy", "Events & MICE", "Fashion & Apparel",
  "Film & Video", "FinTech", "Fitness & Sports", "Food & Beverage",
  "Furniture & Homeware", "Gaming & Esports", "Healthcare",
  "Home & Facility Services", "Hotels & Hospitality", "HR & Recruiting",
  "Import & Export", "Insurance", "Jewellery & Gems", "Legal",
  "Logistics & Supply Chain", "Manufacturing", "Marketing & Advertising",
  "Media & Content", "Music & Performing Arts", "Nonprofit & Social Impact",
  "Pets & Animal Care", "Printing & Packaging", "Real Estate",
  "Restaurants & Cafes", "Retail", "SaaS", "Software & IT Services",
  "Sustainability & Climate", "Travel & Tourism", "Wellness & Spa",
];
