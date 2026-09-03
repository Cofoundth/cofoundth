// Meetups — shared types + pure helpers. Client- AND server-safe (no imports
// that touch next/headers or the service role), so pages, the RSVP button, and
// the admin form can all pull from here.

export type MeetupFormat = "in_person" | "online";
export type MeetupStatus = "draft" | "published" | "cancelled";
export type MeetupCategory =
  | "run"
  | "coffee"
  | "cowork"
  | "dinner"
  | "talk"
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
  other: { emoji: "✨", label: "Other" },
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
      ? m.online_url ?? "Online"
      : m.location ?? "To be announced";

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
