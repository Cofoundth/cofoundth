import Link from "next/link";
import { Calendar, Check, MapPin, Plus, Video } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import {
  MEETUP_CATEGORIES,
  meetupWhenParts,
  type Meetup,
} from "@/lib/meetups";
import { nowISO } from "@/lib/time";
import { isInvestorAccount } from "@/lib/account";
import { colorFor, getInitials } from "@/components/Avatar";
import { EmptyState, LinkButton, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

type Row = Pick<
  Meetup,
  | "id"
  | "slug"
  | "title"
  | "format"
  | "location"
  | "online_url"
  | "starts_at"
  | "ends_at"
  | "capacity"
  | "status"
  | "category"
  | "created_by"
>;

type MiniProfile = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
};

const SELECT =
  "id, slug, title, format, location, online_url, starts_at, ends_at, capacity, status, category, created_by";

// 24px face for the going-pile and the host line. Avatar's smallest size is
// 36px — right for list rows, oversized inside a card footer — so this is the
// one place the app draws faces smaller, reusing Avatar's own colour + initial
// helpers so the same person looks the same everywhere.
function MiniFace({ p }: { p: MiniProfile }) {
  return p.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.photo_url}
      alt={p.full_name ?? ""}
      className="w-6 h-6 rounded-full object-cover"
    />
  ) : (
    <span
      className="w-6 h-6 rounded-full grid place-items-center text-[11px] text-white font-serif"
      style={{ backgroundColor: colorFor(p.full_name) }}
    >
      {getInitials(p.full_name).charAt(0)}
    </span>
  );
}

export default async function MeetupsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const now = nowISO();

  // RLS already hides drafts. Upcoming keeps cancelled rows visible (so people
  // who RSVP'd learn it's off); past shows published only.
  const [{ data: upcomingRaw }, { data: pastRaw }, investor] =
    await Promise.all([
      supabase
        .from("meetups")
        .select(SELECT)
        .gte("starts_at", now)
        .order("starts_at", { ascending: true }),
      supabase
        .from("meetups")
        .select(SELECT)
        .lt("starts_at", now)
        .eq("status", "published")
        .order("starts_at", { ascending: false })
        .limit(10),
      isInvestorAccount(supabase, user.id),
    ]);

  const upcoming = (upcomingRaw ?? []) as Row[];
  const past = (pastRaw ?? []) as Row[];

  // One round-trip for every listed meetup's RSVPs → counts, piles, "am I
  // going", and the header's social proof.
  const ids = [...upcoming, ...past].map((m) => m.id);
  const { data: rsvps } = ids.length
    ? await supabase
        .from("meetup_rsvps")
        .select("meetup_id, user_id")
        .in("meetup_id", ids)
    : { data: [] as { meetup_id: string; user_id: string }[] };

  const countBy = new Map<string, number>();
  const goersBy = new Map<string, string[]>();
  const mine = new Set<string>();
  const upcomingIds = new Set(upcoming.map((m) => m.id));
  const nearbyGoers = new Set<string>();
  for (const r of rsvps ?? []) {
    countBy.set(r.meetup_id, (countBy.get(r.meetup_id) ?? 0) + 1);
    const g = goersBy.get(r.meetup_id) ?? [];
    if (g.length < 4) g.push(r.user_id);
    goersBy.set(r.meetup_id, g);
    if (r.user_id === user.id) mine.add(r.meetup_id);
    if (upcomingIds.has(r.meetup_id)) nearbyGoers.add(r.user_id);
  }

  // Faces for the piles + the "Hosted by" lines, one query.
  const faceIds = [
    ...new Set([
      ...[...goersBy.values()].flat(),
      ...upcoming.map((m) => m.created_by),
      ...past.map((m) => m.created_by),
    ]),
  ];
  const { data: faceRows } = faceIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", faceIds)
    : { data: [] as MiniProfile[] };
  const faces = new Map((faceRows ?? []).map((p) => [p.id, p as MiniProfile]));

  // This month / later, in Bangkok time — the split Onfound's page leads with.
  const bkkMonth = (iso: string) =>
    new Date(iso).toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
    });
  const currentMonth = bkkMonth(now);
  const thisMonth = upcoming.filter((m) => bkkMonth(m.starts_at) === currentMonth);
  const later = upcoming.filter((m) => bkkMonth(m.starts_at) !== currentMonth);

  const [
    tTitle,
    tThisMonth,
    tLater,
    tPast,
    tGoing,
    tOnline,
    tInPerson,
    tCancelled,
    tYouGoing,
    tHostedBy,
    tBeFirst,
    tFull,
    tSpotsLeft,
    tCreate,
    tNearby,
    tEmptyTitle,
    tEmptyBody,
    tHostFirst,
  ] = await Promise.all([
    tServer("Meetups"),
    tServer("This month"),
    tServer("Upcoming"),
    tServer("Past meetups"),
    tServer("going"),
    tServer("Online"),
    tServer("In person"),
    tServer("Cancelled"),
    tServer("You're going"),
    tServer("Hosted by {name}"),
    tServer("Be the first to join"),
    tServer("Fully booked"),
    tServer("{n} spots left"),
    tServer("Create a meetup"),
    tServer("{n} founders joining meetups"),
    tServer("No meetups on the calendar"),
    tServer(
      "Want to meet founders in person? Host the first one — every member will see it.",
    ),
    tServer("Host the first meetup"),
  ]);

  const catLabels = Object.fromEntries(
    await Promise.all(
      Object.entries(MEETUP_CATEGORIES).map(async ([k, c]) => [
        k,
        await tServer(c.label),
      ]),
    ),
  ) as Record<string, string>;

  const labels = {
    going: tGoing,
    online: tOnline,
    inPerson: tInPerson,
    cancelled: tCancelled,
    youGoing: tYouGoing,
    hostedBy: tHostedBy,
    beFirst: tBeFirst,
    full: tFull,
    spotsLeft: tSpotsLeft,
    catLabels,
  };

  const card = (m: Row, past?: boolean) => (
    <MeetupCard
      key={m.id}
      m={m}
      count={countBy.get(m.id) ?? 0}
      goers={(goersBy.get(m.id) ?? [])
        .map((id) => faces.get(id))
        .filter(Boolean) as MiniProfile[]}
      host={faces.get(m.created_by) ?? null}
      going={mine.has(m.id)}
      labels={labels}
      past={past}
    />
  );

  return (
    <Section>
      {/* Header: title + the calendar's social proof, create on the right —
          the shape Onfound's events page opens with. */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-d2">{tTitle}</h1>
          {nearbyGoers.size > 0 && (
            <div className="mt-2 flex items-center gap-2.5">
              <div className="flex -space-x-1.5">
                {[...nearbyGoers].slice(0, 5).map((id) => {
                  const p = faces.get(id);
                  return p ? (
                    <span key={id} className="rounded-full ring-2 ring-cream inline-flex">
                      <MiniFace p={p} />
                    </span>
                  ) : null;
                })}
              </div>
              <span className="text-sm text-ink-muted">
                {tNearby.replace("{n}", String(nearbyGoers.size))}
              </span>
            </div>
          )}
        </div>
        {!investor && (
          <LinkButton href="/meetups/new" size="sm">
            <Plus className="w-4 h-4" />
            {tCreate}
          </LinkButton>
        )}
      </div>

      {upcoming.length === 0 ? (
        // KIND A — founders can now HOST, so the empty calendar's call to
        // action is the page's own feature, not a detour to /browse.
        // Investors can't host (or browse founders), so they get the honest
        // line without a button.
        <EmptyState
          icon={Calendar}
          title={tEmptyTitle}
          description={tEmptyBody}
          action={
            investor ? undefined : (
              <LinkButton href="/meetups/new">{tHostFirst}</LinkButton>
            )
          }
        />
      ) : (
        <>
          {thisMonth.length > 0 && (
            <section>
              <h2 className="text-lg font-bold tracking-normal mb-5">
                {tThisMonth}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {thisMonth.map((m) => card(m))}
              </div>
            </section>
          )}
          {later.length > 0 && (
            <section className={thisMonth.length > 0 ? "mt-14" : ""}>
              <h2 className="text-lg font-bold tracking-normal mb-5">
                {tLater}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {later.map((m) => card(m))}
              </div>
            </section>
          )}
        </>
      )}

      {past.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-normal mb-5">{tPast}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {past.map((m) => card(m, true))}
          </div>
        </section>
      )}
    </Section>
  );
}

function MeetupCard({
  m,
  count,
  goers,
  host,
  going,
  labels,
  past,
}: {
  m: Row;
  count: number;
  goers: MiniProfile[];
  host: MiniProfile | null;
  going: boolean;
  labels: {
    going: string;
    online: string;
    inPerson: string;
    cancelled: string;
    youGoing: string;
    hostedBy: string;
    beFirst: string;
    full: string;
    spotsLeft: string;
    catLabels: Record<string, string>;
  };
  past?: boolean;
}) {
  const when = meetupWhenParts(m.starts_at);
  const cancelled = m.status === "cancelled";
  const cat = MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other;
  const where =
    m.format === "online" ? labels.online : m.location ?? labels.inPerson;
  const spotsLeft =
    m.capacity != null ? Math.max(0, m.capacity - count) : null;

  return (
    // min-w-0: grid items default to min-width:auto and refuse to shrink
    // below their content — the overflow class of bug fixed on every other
    // card grid in the app.
    <Link
      href={`/meetups/${m.slug}`}
      className={`group block h-full min-w-0 ${past ? "opacity-70" : ""}`}
    >
      <div className="bg-white rounded-3xl shadow-xs hover:shadow-sm transition-shadow h-full flex flex-col overflow-hidden">
        {/* Emoji band — the card's image without an image pipeline. One tan
            accent surface for every category (the palette has no hue coding);
            the emoji + chip carry the distinction. */}
        <div className="relative h-24 shrink-0 bg-gold-soft grid place-items-center">
          <span className="text-4xl" aria-hidden="true">
            {cat.emoji}
          </span>
          <span className="absolute top-3 left-3 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-white/85 text-ink">
            {labels.catLabels[m.category] ?? m.category}
          </span>
          {cancelled && (
            <span className="absolute top-3 right-3 text-xs uppercase tracking-[0.15em] text-danger-ink bg-danger-surface border border-danger-line rounded-full px-2 py-0.5">
              {labels.cancelled}
            </span>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1 min-h-0">
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">
            {when.weekday} · {when.day} {when.monthYear} · {when.time}
          </div>
          {/* Two reserved lines, so a one-line title and a two-line title
              produce the same card — the symmetry rule every directory card
              in the app follows. */}
          <h3 className="text-xl mt-2 line-clamp-2 min-h-[56px]">{m.title}</h3>

          <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted min-w-0">
            {m.format === "online" ? (
              <Video className="w-3 h-3 shrink-0" />
            ) : (
              <MapPin className="w-3 h-3 shrink-0" />
            )}
            <span className="truncate">{where}</span>
          </div>

          {/* Host — reserved even when the profile row is missing, so the
              footer lands on the same y on every card. */}
          <div className="mt-2 h-6 flex items-center gap-2 text-xs text-ink-muted min-w-0">
            {host && (
              <>
                <MiniFace p={host} />
                <span className="truncate">
                  {labels.hostedBy.replace("{name}", host.full_name ?? "—")}
                </span>
              </>
            )}
          </div>

          {/* Footer: the pile + the one line that answers "can I still go". */}
          <div className="mt-auto pt-4 flex items-center gap-2 min-w-0">
            {goers.length > 0 && (
              <div className="flex -space-x-1.5 shrink-0">
                {goers.map((p) => (
                  <span key={p.id} className="rounded-full ring-2 ring-white inline-flex">
                    <MiniFace p={p} />
                  </span>
                ))}
              </div>
            )}
            <span className="text-xs text-ink-muted truncate">
              {count === 0 ? (
                labels.beFirst
              ) : (
                <>
                  {count} {labels.going}
                </>
              )}
            </span>
            {!cancelled && spotsLeft !== null && count > 0 && (
              <span
                className={`ml-auto shrink-0 text-xs px-2 py-0.5 rounded-full ${
                  spotsLeft === 0
                    ? "bg-navy text-white"
                    : "bg-gold-soft text-gold-ink"
                }`}
              >
                {spotsLeft === 0
                  ? labels.full
                  : labels.spotsLeft.replace("{n}", String(spotsLeft))}
              </span>
            )}
            {going && !cancelled && (
              <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-xs text-navy">
                <Check className="w-3 h-3" /> {labels.youGoing}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
