import Link from "next/link";
import { Calendar, MapPin, Video, Users, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { tServer } from "@/lib/i18n-server";
import { meetupWhenParts, type Meetup } from "@/lib/meetups";
import { nowISO } from "@/lib/time";
import { isInvestorAccount } from "@/lib/account";
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
>;

const SELECT =
  "id, slug, title, format, location, online_url, starts_at, ends_at, capacity, status";

export default async function MeetupsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const now = nowISO();

  // RLS already hides drafts. Upcoming keeps cancelled rows visible (so people
  // who RSVP'd learn it's off); past shows published only.
  // `investor` decides the empty-state CTA: investors are blocked from /browse
  // by lib/investor-routes.ts, so they must not be sent there.
  const [{ data: upcomingRaw }, { data: pastRaw }, investor] = await Promise.all([
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

  // One round-trip for every listed meetup's RSVPs → counts + "am I going".
  const ids = [...upcoming, ...past].map((m) => m.id);
  const { data: rsvps } = ids.length
    ? await supabase.from("meetup_rsvps").select("meetup_id, user_id").in("meetup_id", ids)
    : { data: [] as { meetup_id: string; user_id: string }[] };

  const countBy = new Map<string, number>();
  const mine = new Set<string>();
  for (const r of rsvps ?? []) {
    countBy.set(r.meetup_id, (countBy.get(r.meetup_id) ?? 0) + 1);
    if (r.user_id === user.id) mine.add(r.meetup_id);
  }

  const [
    tEyebrow,
    tTitle,
    tIntro,
    tUpcoming,
    tPast,
    tGoing,
    tOnline,
    tInPerson,
    tCancelled,
    tYouGoing,
    tEmptyTitle,
    tEmptyBody,
    tBrowseFounders,
  ] = await Promise.all([
    tServer("Community"),
    tServer("Meetups"),
    tServer("In-person and online gatherings for the Cofoundee community."),
    tServer("Upcoming"),
    tServer("Past meetups"),
    tServer("going"),
    tServer("Online"),
    tServer("In person"),
    tServer("Cancelled"),
    tServer("You're going"),
    tServer("No meetups on the calendar"),
    tServer(
      "Cofoundee meetups get announced here first. Nothing is scheduled right now.",
    ),
    tServer("Browse founders"),
  ]);

  const labels = {
    going: tGoing,
    online: tOnline,
    inPerson: tInPerson,
    cancelled: tCancelled,
    youGoing: tYouGoing,
  };

  return (
    <Section>
      <div className="mb-8 max-w-[640px]">
        <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-6">
          {tEyebrow}
        </div>
        <h1 className="text-d3 mb-4">{tTitle}</h1>
        <p className="text-lg text-ink leading-relaxed">{tIntro}</p>
      </div>

      <section>
        <h2 className="text-lg font-bold tracking-normal mb-5">
          {tUpcoming}
        </h2>
        {upcoming.length === 0 ? (
          // KIND A — no meetups exist. Members cannot schedule one (that is
          // admin-only), so the CTA points at the liveliest thing we do have,
          // the founder directory. Investors are blocked from /browse, so they
          // get the honest line without a button rather than a dead link.
          <EmptyState
            icon={Calendar}
            title={tEmptyTitle}
            description={tEmptyBody}
            action={
              investor ? undefined : (
                <LinkButton href="/browse">{tBrowseFounders}</LinkButton>
              )
            }
          />
        ) : (
          <div className="space-y-4">
            {upcoming.map((m) => (
              <MeetupItem
                key={m.id}
                m={m}
                count={countBy.get(m.id) ?? 0}
                going={mine.has(m.id)}
                labels={labels}
              />
            ))}
          </div>
        )}
      </section>

      {past.length > 0 && (
        <section className="mt-14">
          <h2 className="text-lg font-bold tracking-normal mb-5">
            {tPast}
          </h2>
          <div className="space-y-4">
            {past.map((m) => (
              <MeetupItem
                key={m.id}
                m={m}
                count={countBy.get(m.id) ?? 0}
                going={mine.has(m.id)}
                labels={labels}
                past
              />
            ))}
          </div>
        </section>
      )}
    </Section>
  );
}

function MeetupItem({
  m,
  count,
  going,
  labels,
  past,
}: {
  m: Row;
  count: number;
  going: boolean;
  labels: {
    going: string;
    online: string;
    inPerson: string;
    cancelled: string;
    youGoing: string;
  };
  past?: boolean;
}) {
  const when = meetupWhenParts(m.starts_at);
  const cancelled = m.status === "cancelled";
  const where =
    m.format === "online" ? labels.online : m.location ?? labels.inPerson;

  return (
    <Link
      href={`/meetups/${m.slug}`}
      className={`bg-white rounded-3xl shadow-xs p-6 lg:p-8 flex flex-col md:flex-row gap-6 hover:shadow-sm transition-shadow ${
        past ? "opacity-70" : ""
      }`}
    >
      <div className="md:w-28 shrink-0">
        <div className="font-serif text-num2 text-navy">
          {when.day}
        </div>
        <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mt-1">
          {when.monthYear}
        </div>
        <div className="text-xs text-ink-muted mt-1">{when.time}</div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-3">
          <h3 className="text-xl mb-2 flex-1">{m.title}</h3>
          {cancelled && (
            <span className="shrink-0 text-[11px] uppercase tracking-[0.15em] text-danger-ink border border-danger-line rounded-full px-2 py-0.5">
              {labels.cancelled}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-muted">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {when.weekday}
          </span>
          <span className="inline-flex items-center gap-1">
            {m.format === "online" ? (
              <Video className="w-3 h-3" />
            ) : (
              <MapPin className="w-3 h-3" />
            )}
            {where}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            {count}
            {m.capacity != null ? `/${m.capacity}` : ""} {labels.going}
          </span>
          {going && !cancelled && (
            <span className="inline-flex items-center gap-1 text-navy">
              <Check className="w-3 h-3" /> {labels.youGoing}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
