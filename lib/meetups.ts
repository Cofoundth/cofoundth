// Meetups — shared types + pure helpers. Client- AND server-safe (no imports
// that touch next/headers or the service role), so pages, the RSVP button, and
// the admin form can all pull from here.

// Ladprao — where the team actually is — not the tourist-map city centre.
// [lat, lng]. Lives HERE rather than in components/MeetupMap.tsx because both
// the map (client) and the geocode proxy (server route handler, which biases
// place search to this point) need it, and MeetupMap imports leaflet's CSS at
// module scope — not something a route handler should pull into its graph.
export const MEETUP_MAP_CENTER: [number, number] = [13.8163, 100.5608];

export type MeetupFormat = "in_person" | "online";
export type MeetupStatus = "draft" | "published" | "cancelled";
export type MeetupCategory =
  | "run"
  | "coffee"
  | "cowork"
  | "dinner"
  | "talk"
  | "gym"
  | "hike"
  | "walk"
  | "drinks"
  | "other";

// Every card carries a cover: the host's upload when there is one, else the
// category's bundled SVG — so an image is guaranteed without requiring one.
export function meetupCoverUrl(m: {
  image_url?: string | null;
  category: MeetupCategory;
}): string {
  return m.image_url ?? `/meetup-covers/${m.category}.svg`;
}

// The card's cover fallback + chip both key off this. Labels are English source
// strings — call sites translate. Onfound's set (Run/Coffee/Cowork/Dinner/
// Other) plus Talk, which Bangkok founder events actually skew toward.
export const MEETUP_CATEGORIES: Record<
  MeetupCategory,
  { emoji: string; label: string }
> = {
  coffee: { emoji: "☕", label: "Coffee" },
  cowork: { emoji: "💻", label: "Cowork" },
  dinner: { emoji: "🍜", label: "Dinner" },
  talk: { emoji: "🎤", label: "Talk" },
  run: { emoji: "🏃", label: "Run" },
  gym: { emoji: "🏋️", label: "Gym" },
  hike: { emoji: "⛰️", label: "Hike" },
  walk: { emoji: "🚶", label: "Walk" },
  drinks: { emoji: "🍻", label: "Drinks" },
  other: { emoji: "✨", label: "Other" },
};

// The tile step groups the formats the way the reference flow does — a few
// short sections under eyebrows beats one flat grid of ten. Section labels are
// English source strings (call sites translate).
//
// EXACTLY-ONCE IS A REAL COMPILER GUARANTEE, not a comment: the assignment is
// the other way round. Each category names its section in a
// `Record<MeetupCategory, …>`, so a missing category is a type error, a
// duplicate is a duplicate object key, and a typo'd section label is caught by
// the value type. The wizard's first step renders ONLY from this table — a
// category that slipped out of it would be unpickable while still rendering on
// every card that already carries it.
const SECTION_ORDER = [
  "Eat & drink",
  "Work & talk",
  "Move",
  "Something else",
] as const;

type CategorySection = (typeof SECTION_ORDER)[number];

// Declaration order here is the order the tiles render inside their section.
const CATEGORY_SECTION: Record<MeetupCategory, CategorySection> = {
  coffee: "Eat & drink",
  dinner: "Eat & drink",
  drinks: "Eat & drink",
  cowork: "Work & talk",
  talk: "Work & talk",
  run: "Move",
  gym: "Move",
  hike: "Move",
  walk: "Move",
  other: "Something else",
};

export const MEETUP_CATEGORY_SECTIONS: {
  label: string;
  keys: MeetupCategory[];
}[] = SECTION_ORDER.map((label) => ({
  label,
  keys: (Object.keys(CATEGORY_SECTION) as MeetupCategory[]).filter(
    (key) => CATEGORY_SECTION[key] === label,
  ),
}));

// ── Topic ──────────────────────────────────────────────────────────────────
// What the meetup is ABOUT, as distinct from the format it takes. A coffee can
// be about runway or about burnout, and the founder scanning the calendar
// wants to know which. Twelve, fixed: a free-text field here would fragment
// into twelve spellings of "fundraising" and stop being filterable.
//
// Keys are stored in meetups.topic and constrained by the CHECK in
// 0071_meetup_topic.sql — add one HERE and you must add it THERE too.
export type MeetupTopic =
  | "customers"
  | "feedback"
  | "fundraising"
  | "cofounder"
  | "team"
  | "sales_marketing"
  | "product_ux"
  | "ai_tools"
  | "wellbeing"
  | "scaling"
  | "accountability"
  | "connecting";

export const MEETUP_TOPICS: Record<
  MeetupTopic,
  { label: string; blurb: string }
> = {
  customers: {
    label: "Finding customers",
    blurb: "Sales, marketing, traction",
  },
  feedback: {
    label: "Getting feedback",
    blurb: "Ideas, product, positioning",
  },
  fundraising: {
    label: "Raising money",
    blurb: "Funding, cashflow, runway",
  },
  cofounder: {
    label: "Finding a co-founder",
    blurb: "Partners, skills, alignment",
  },
  team: {
    label: "Building a team",
    blurb: "Hiring, culture, leadership",
  },
  sales_marketing: {
    label: "Sales & marketing",
    blurb: "Content, growth, distribution",
  },
  product_ux: {
    label: "Product & UX",
    blurb: "Features, retention, user experience",
  },
  ai_tools: {
    label: "AI & tools",
    blurb: "Automation, workflows, leverage",
  },
  wellbeing: {
    label: "Founder wellbeing",
    blurb: "Burnout, balance, resilience",
  },
  // "Scaling up", not "Scaling": the bare word is already a company STAGE
  // label ("กำลังขยาย" — currently expanding), and translations key off the
  // English string, so reusing it would put a stage word in a topic row.
  scaling: {
    label: "Scaling up",
    blurb: "Systems, operations, growth",
  },
  accountability: {
    label: "Accountability",
    blurb: "Focus, goals, momentum",
  },
  connecting: {
    label: "Just connecting",
    blurb: "No agenda, meet good founders",
  },
};

export type Meetup = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  format: MeetupFormat;
  location: string | null;
  online_url: string | null;
  starts_at: string;
  ends_at: string | null;
  capacity: number | null;
  status: MeetupStatus;
  category: MeetupCategory;
  topic: MeetupTopic | null;
  image_url: string | null;
  visibility: "public" | "private";
  lat: number | null;
  lng: number | null;
  created_by: string;
  created_at: string;
  updated_at: string;
};

// Thailand is a fixed UTC+07:00 (no DST), so a single offset is correct all
// year. All meetup times are entered + displayed in Bangkok time regardless of
// where the server runs (Vercel is UTC).
export const MEETUP_TZ = "Asia/Bangkok";
const BKK_OFFSET = "+07:00";

// ── Display ────────────────────────────────────────────────────────────────
// Split a stored instant into Bangkok-local parts for the editorial date block.
export function meetupWhenParts(iso: string): {
  day: string;
  monthYear: string;
  weekday: string;
  time: string;
} {
  const d = new Date(iso);
  const opt = { timeZone: MEETUP_TZ } as const;
  return {
    day: d.toLocaleDateString("en-GB", { ...opt, day: "numeric" }),
    monthYear: d.toLocaleDateString("en-GB", {
      ...opt,
      month: "short",
      year: "numeric",
    }),
    weekday: d.toLocaleDateString("en-GB", { ...opt, weekday: "long" }),
    time: d.toLocaleTimeString("en-GB", {
      ...opt,
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

// ── <input type="datetime-local"> bridging (Bangkok) ────────────────────────
// Stored instant → "YYYY-MM-DDTHH:mm" in Bangkok, to seed the edit form.
export function toBangkokInput(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEETUP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // Some ICU builds emit "24" for midnight under hour12:false — normalise.
  const hour = get("hour") === "24" ? "00" : get("hour");
  return `${get("year")}-${get("month")}-${get("day")}T${hour}:${get("minute")}`;
}

// Today in Bangkok as "YYYY-MM-DD" — the `min` a date picker needs so a
// meetup can't be scheduled into the past. en-CA formats as ISO, which is why
// every date helper here uses it.
export function bangkokToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: MEETUP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// "YYYY-MM-DD" → the next calendar day, same format. Parsed at UTC noon so no
// offset can push the arithmetic onto the wrong day.
export function nextBangkokDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  if (isNaN(d.getTime())) return day;
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// "YYYY-MM-DDTHH:mm" typed in the form (Bangkok local) → a UTC ISO instant.
// Returns null on a malformed / impossible value so the action can reject it.
export function bangkokInputToISO(v: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return null;
  const d = new Date(`${v}:00${BKK_OFFSET}`);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

// ── Add to Google Calendar ──────────────────────────────────────────────────
// Google Calendar's TEMPLATE link wants UTC as YYYYMMDDTHHMMSSZ.
function toGCalDate(d: Date): string {
  return d.toISOString().replace(/[-:]|\.\d{3}/g, "");
}

// Build an "add to Google Calendar" link for a meetup. Pure — safe to compute in
// a server component and drop straight into an <a href>. Mirrors the intro-call
// link in messages/[matchId]/ConversationActions.tsx.
export function meetupCalendarUrl(m: {
  title: string;
  description?: string | null;
  location?: string | null;
  online_url?: string | null;
  format: MeetupFormat;
  starts_at: string;
  ends_at?: string | null;
}): string {
  const start = new Date(m.starts_at);
  // Default to a 2-hour block when no end time was set.
  const end = m.ends_at
    ? new Date(m.ends_at)
    : new Date(start.getTime() + 2 * 60 * 60_000);

  const where =
    m.format === "online"
      ? (m.online_url ?? "Online")
      : (m.location ?? "To be announced");

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Cofoundee · ${m.title}`,
    dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
    location: where,
  });

  const details = [
    m.description?.trim() || null,
    m.format === "online" && m.online_url ? `Join: ${m.online_url}` : null,
    "via Cofoundee — https://cofoundee.co",
  ]
    .filter(Boolean)
    .join("\n\n");
  if (details) params.set("details", details);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
