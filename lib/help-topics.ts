// Cofoundee — what a member can help another founder with.
//
// OUTCOMES, not job titles and not technologies. "Getting your first customers",
// not "Sales". "Figuring out pricing", not "Finance". The test each entry has to
// pass: does it name a problem someone would actually message a stranger about?
//
// Deliberately a SEPARATE axis from lib/skills.ts. COMMON_SKILLS is hard skills
// (React, SEO, DevOps) and describes a CV; this describes a problem you can
// unblock, which is what gives a stranger a reason to open the conversation.
// Both are stored, both are useful, neither replaces the other.
//
// Every label is OFFER-side: the implied frame is "I can help with…", and the
// "you/your" in a label is the person being helped. The field label must carry
// that frame ("I can help with…" / "ช่วยเรื่อง…") or the chips read ambiguously
// in Thai.
//
// Roughly a third of the list is Thai operating reality that no competitor's
// taxonomy has — company registration, VAT, อย. approval, BOI and foreign
// ownership, Shopee/Lazada/TikTok Shop, LINE OA, PromptPay, DEPA/NIA/OSMEP
// grants, finding Thai suppliers. That part is the point of the list.
//
// Ordered by how commonly a founder needs it, most common first — NOT
// alphabetically. The last entry is a deliberate opt-out so nobody has to claim
// expertise they do not have.
//
// Translated per-string via lib/translations.json.
export const HELP_TOPICS: string[] = [
  "Getting your first customers", "Figuring out pricing",
  "Sales conversations and closing the deal",
  "Keeping customers coming back", "Branding, naming and positioning",
  "Social media and content people watch",
  "Running ads without burning money", "Working with influencers and KOLs",
  "LINE OA and selling through LINE",
  "Live selling (Facebook Live, TikTok Live)",
  "Selling on Shopee, Lazada and TikTok Shop",
  "Selling at markets, fairs and trade shows",
  "Getting into Thai retail, distributors and resellers",
  "Selling to Thai corporates and government",
  "Finding customers outside Thailand", "Managing money and cashflow",
  "Taking payments (PromptPay, transfers, cards, fees)",
  "Getting paid on time by business customers",
  "Knowing which numbers to watch",
  "Registering a company (and whether you need to yet)",
  "Thai accounting, VAT and tax",
  "Contracts and legal paperwork in Thailand",
  "Licences, permits and Thai FDA approval",
  "Registering a trademark and dealing with copycats",
  "Getting a bank loan or SME financing",
  "Government grants and SME support (DEPA, NIA, OSMEP)",
  "Fundraising and pitching investors",
  "Doing business in Thailand as a foreigner (ownership, BOI, visas)",
  "Testing an idea before you spend money on it",
  "Getting a website or app built when you are not technical",
  "Developing a physical product (samples, packaging, MOQs)",
  "Finding suppliers and manufacturers (Thailand and China)",
  "Import and export paperwork (customs, duties, shipping)",
  "Managing stock and inventory", "Shipping, delivery and cash on delivery",
  "Finding a shop location and negotiating the lease",
  "Running a food and drink business (kitchen, licences, delivery apps)",
  "Running a hotel, tour or hospitality business (OTAs, low season)",
  "Using AI in your business", "Getting the business to run without you",
  "Hiring Thai staff, payroll and keeping them",
  "Working with agencies and freelancers",
  "Working with a co-founder or partner (equity, roles, falling out)",
  "Working with family in the business (roles, money, succession)",
  "Opening more branches or franchising",
  "Getting press and telling your story", "Introductions to people I know",
  "What my industry is really like from the inside",
  "Honest feedback when you need it",
  "Regular check-ins to keep you accountable", "Staying sane as a founder",
  "Deciding whether to change direction or close",
  "Nothing right now, just here to meet people",
];
