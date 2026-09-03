import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Check,
  List as ListIcon,
  Map as MapIcon,
  MapPin,
  Plus,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import {
  MEETUP_CATEGORIES,
  meetupCoverUrl,
  meetupWhenParts,
  type Meetup,
} from "@/lib/meetups";
import { nowISO } from "@/lib/time";
import { isInvestorAccount } from "@/lib/account";
import { colorFor, getInitials } from "@/components/Avatar";
import { MeetupMap, type MeetupPin } from "@/components/MeetupMap";
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
  | "image_url"
  | "lat"
  | "lng"
  | "created_by"
>;

type MiniProfile = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
};

const SELECT =
  "id, slug, title, format, location, online_url, starts_at, ends_at, capacity, status, category, image_url, lat, lng, created_by";

// 24px face for the going-pile and the host ribbon. Avatar's smallest size is
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

export default async function MeetupsPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const now = nowISO();
  const { view } = await searchParams;
  const mapView = view === "map";

  // RLS already hides drafts; private meetups are link-only, so the listing
  // (and the map) show public rows exclusively. Upcoming keeps cancelled rows
  // visible so people who RSVP'd learn it's off; past shows published only.
  const [{ data: upcomingRaw }, { data: pastRaw }, investor] =
    await Promise.all([
      supabase
        .from("meetups")
        .select(SELECT)
        .eq("visibility", "public")
        .gte("starts_at", now)
        .order("starts_at", { ascending: true }),
      supabase
        .from("meetups")
        .select(SELECT)
        .eq("visibility", "public")
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

  // Faces for the piles + the host ribbons, one query.
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

  // This month / later, in Bangkok time — the split the reference page leads
  // with; this-month renders as a horizontally scrolling strip like theirs.
  const bkkMonth = (iso: string) =>
    new Date(iso).toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
    });
  const currentMonth = bkkMonth(now);
  const thisMonth = upcoming.filter(
    (m) => bkkMonth(m.starts_at) === currentMonth,
  );
  const later = upcoming.filter((m) => bkkMonth(m.starts_at) !== currentMonth);

  const pins: MeetupPin[] = upcoming
    .filter((m) => m.lat != null && m.lng != null && m.status !== "cancelled")
    .map((m) => ({
      slug: m.slug,
      title: m.title,
      lat: m.lat as number,
      lng: m.lng as number,
      emoji: (MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other).emoji,
    }));

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
    tListLabel,
    tMapLabel,
    tPromoTitle,
    tPromoBody,
    tNoPins,
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
    tServer("List"),
    tServer("Map"),
    tServer("Create your own meetup"),
    tServer("and every founder on Cofoundee will see it"),
    tServer("Meetups with a map pin show up here."),
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

  const card = (m: Row, opts?: { past?: boolean; strip?: boolean }) => (
    <MeetupCard
      key={m.id}
      m={m}
      count={countBy.get(m.id) ?? 0}
      goers={
        (goersBy.get(m.id) ?? [])
          .map((id) => faces.get(id))
          .filter(Boolean) as MiniProfile[]
      }
      host={faces.get(m.created_by) ?? null}
      going={mine.has(m.id)}
      labels={labels}
      past={opts?.past}
      strip={opts?.strip}
    />
  );

  // Their toggle: two small labelled buttons, top-right of the header.
  const toggleCls = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 text-sm tracking-wide transition-colors border rounded-full ${
      active
        ? "bg-navy border-navy text-white"
        : "bg-white border-line text-ink hover:border-navy"
    }`;

  return (
    <Section>
      {/* Header: title + social proof left, view toggle + create right — the
          shape the reference events page opens with. */}
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-d2">{tTitle}</h1>
          {nearbyGoers.size > 0 && (
            <div className="mt-2 flex items-center gap-2.5">
              <div className="flex -space-x-1.5">
                {[...nearbyGoers].slice(0, 5).map((id) => {
                  const p = faces.get(id);
                  return p ? (
                    <span
                      key={id}
                      className="rounded-full ring-2 ring-cream inline-flex"
                    >
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
        <div className="flex items-center gap-2">
          <Link href="/meetups" className={toggleCls(!mapView)}>
            <ListIcon className="w-3.5 h-3.5" /> {tListLabel}
          </Link>
          <Link href="/meetups?view=map" className={toggleCls(mapView)}>
            <MapIcon className="w-3.5 h-3.5" /> {tMapLabel}
          </Link>
          {!investor && (
            <LinkButton href="/meetups/new" size="sm">
              <Plus className="w-4 h-4" />
              {tCreate}
            </LinkButton>
          )}
        </div>
      </div>

      {mapView ? (
        <div>
          <MeetupMap pins={pins} />
          {pins.length === 0 && (
            <p className="mt-4 text-sm text-ink-muted">{tNoPins}</p>
          )}
        </div>
      ) : upcoming.length === 0 ? (
        // KIND A — founders can HOST, so the empty calendar's call to action
        // is the page's own feature. Investors can't host, so they get the
        // honest line without a button.
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
              {/* Horizontal strip, like theirs: fixed-width cards, scroll to
                  see the rest, the create promo as the strip's last card. */}
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {thisMonth.map((m) => card(m, { strip: true }))}
                {!investor && (
                  <Link
                    href="/meetups/new"
                    className="snap-start shrink-0 w-[300px] min-w-0 rounded-3xl bg-navy p-6 flex flex-col justify-center hover:bg-navy-dark transition-colors"
                  >
                    <span className="text-3xl mb-3" aria-hidden="true">
                      ✨
                    </span>
                    <span className="text-white font-semibold leading-snug">
                      {tPromoTitle}
                    </span>
                    <span className="text-white/70 text-sm mt-1 leading-relaxed">
                      {tPromoBody}
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold">
                      {tCreate} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </Link>
                )}
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

      {!mapView && past.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-normal mb-5">{tPast}</h2>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {past.map((m) => card(m, { past: true }))}
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
  strip,
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
  strip?: boolean;
}) {
  const when = meetupWhenParts(m.starts_at);
  const cancelled = m.status === "cancelled";
  const where =
    m.format === "online" ? labels.online : m.location ?? labels.inPerson;
  const spotsLeft = m.capacity != null ? Math.max(0, m.capacity - count) : null;

  return (
    // min-w-0: grid/flex items default to min-width:auto and refuse to shrink
    // below their content — the overflow class of bug fixed on every other
    // card grid in the app. Strip cards are fixed-width and snap.
    <Link
      href={`/meetups/${m.slug}`}
      className={`group block min-w-0 ${
        strip ? "snap-start shrink-0 w-[300px]" : "h-full"
      } ${past ? "opacity-70" : ""}`}
    >
      <div className="bg-white rounded-3xl shadow-xs hover:shadow-sm transition-shadow h-full flex flex-col overflow-hidden">
        {/* Cover — the host's upload, else the category artwork. The hosted-by
            ribbon sits ON the image, the way the reference cards carry it. */}
        <div className="relative h-32 shrink-0 bg-gold-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meetupCoverUrl(m)}
            alt=""
            className="h-full w-full object-cover"
          />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/90 text-ink">
            <span aria-hidden="true">
              {(MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other).emoji}
            </span>
            {labels.catLabels[m.category] ?? m.category}
          </span>
          {cancelled && (
            <span className="absolute top-3 right-3 text-xs uppercase tracking-[0.15em] text-danger-ink bg-danger-surface border border-danger-line rounded-full px-2 py-0.5">
              {labels.cancelled}
            </span>
          )}
          {host && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 pl-1 pr-2.5 py-1 text-xs text-ink max-w-[85%]">
              <MiniFace p={host} />
              <span className="truncate">
                {labels.hostedBy.replace("{name}", host.full_name ?? "—")}
              </span>
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

          {/* Footer: the pile, the one line that answers "can I still go",
              and the go-arrow the reference cards end with. */}
          <div className="mt-auto pt-4 flex items-center gap-2 min-w-0">
            {goers.length > 0 && (
              <div className="flex -space-x-1.5 shrink-0">
                {goers.map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full ring-2 ring-white inline-flex"
                  >
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
                className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
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
              <span className="shrink-0 inline-flex items-center gap-1 text-xs text-navy">
                <Check className="w-3 h-3" /> {labels.youGoing}
              </span>
            )}
            <span className="ml-auto shrink-0 w-8 h-8 rounded-full border border-line grid place-items-center text-ink group-hover:bg-navy group-hover:border-navy group-hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
