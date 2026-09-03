// The meetups calendar. This server component only FETCHES — every
// interaction (card dialog, join, create wizard, list/map toggle, roster)
// lives in MeetupsClient, matched to the reference product's dialog-driven
// behaviour. /meetups/[slug] remains the deep-link page (and the only route
// to a private meetup).

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { type Meetup } from "@/lib/meetups";
import { nowISO } from "@/lib/time";
import { isInvestorAccount } from "@/lib/account";
import { Section } from "@/components/ui";
import {
  MeetupsClient,
  type MeetupItemData,
  type MiniProfile,
} from "./MeetupsClient";

export const dynamic = "force-dynamic";

type Row = Pick<
  Meetup,
  | "id"
  | "slug"
  | "title"
  | "description"
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

const SELECT =
  "id, slug, title, description, format, location, online_url, starts_at, ends_at, capacity, status, category, image_url, lat, lng, created_by";

export default async function MeetupsPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const now = nowISO();
  const { create } = await searchParams;

  // RLS already hides drafts; private meetups are link-only, so the listing
  // shows public rows exclusively. Upcoming keeps cancelled rows visible so
  // people who RSVP'd learn it's off; past shows published only.
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
  const nearbyIds: string[] = [];
  for (const r of rsvps ?? []) {
    countBy.set(r.meetup_id, (countBy.get(r.meetup_id) ?? 0) + 1);
    const g = goersBy.get(r.meetup_id) ?? [];
    if (g.length < 6) g.push(r.user_id);
    goersBy.set(r.meetup_id, g);
    if (r.user_id === user.id) mine.add(r.meetup_id);
    if (upcomingIds.has(r.meetup_id) && !nearbyIds.includes(r.user_id))
      nearbyIds.push(r.user_id);
  }

  const faceIds = [
    ...new Set([
      ...[...goersBy.values()].flat(),
      ...nearbyIds,
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

  const toItem = (m: Row): MeetupItemData => ({
    ...m,
    count: countBy.get(m.id) ?? 0,
    goers: (goersBy.get(m.id) ?? [])
      .map((id) => faces.get(id))
      .filter(Boolean) as MiniProfile[],
    host: faces.get(m.created_by) ?? null,
    going: mine.has(m.id),
  });

  // This month / later, in Bangkok time — the split the reference page leads
  // with; this-month renders as the horizontally scrolling strip.
  const bkkMonth = (iso: string) =>
    new Date(iso).toLocaleDateString("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
    });
  const currentMonth = bkkMonth(now);

  return (
    <Section>
      <MeetupsClient
        thisMonth={upcoming
          .filter((m) => bkkMonth(m.starts_at) === currentMonth)
          .map(toItem)}
        later={upcoming
          .filter((m) => bkkMonth(m.starts_at) !== currentMonth)
          .map(toItem)}
        past={past.map(toItem)}
        nearby={nearbyIds.map((id) => faces.get(id)).filter(Boolean) as MiniProfile[]}
        investor={investor}
        initialCreate={create === "1" && !investor}
      />
    </Section>
  );
}
