// The meetups calendar. This server component only FETCHES — every
// interaction (card dialog, join, create wizard, list/map toggle, roster)
// lives in MeetupsClient, matched to the reference product's dialog-driven
// behaviour. /meetups/[slug] remains the deep-link page.

import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { type Meetup } from "@/lib/meetups";
import { nowISO } from "@/lib/time";
import { isInvestorAccount } from "@/lib/account";
import { getBlockedIds } from "@/lib/blocking";
import { Section } from "@/components/ui";
import type { MyRsvp, InviteStatus } from "./actions";
import type { JoinPerson } from "./MeetupJoinControls";
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
  | "topic"
  | "image_url"
  | "lat"
  | "lng"
  | "created_by"
> & { visibility: "public" | "private" };

const SELECT =
  "id, slug, title, description, format, location, online_url, starts_at, ends_at, capacity, status, category, topic, image_url, visibility, lat, lng, created_by";

export default async function MeetupsPage({
  searchParams,
}: {
  searchParams: Promise<{ create?: string }>;
}) {
  const user = await requireUser();
  const supabase = await createClient();
  const now = nowISO();
  const { create } = await searchParams;

  // RLS already hides drafts. Private meetups ARE listed since 0072 — private
  // stopped meaning "unlisted" and started meaning "the host picks who gets
  // in", which is what the reference product does and the only reading under
  // which a private meetup can actually fill. Upcoming keeps cancelled rows
  // visible so people who RSVP'd learn it's off; past shows published only.
  const [{ data: upcomingRaw }, { data: pastRaw }, investor, blocked] =
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
      getBlockedIds(user.id),
    ]);

  // A blocked host takes their meetup with them, the same way /meetups/[slug]
  // 404s one. This matters more now that private meetups are listed: the card
  // carries a "Contact the host" affordance.
  const upcoming = ((upcomingRaw ?? []) as Row[]).filter(
    (m) => !blocked.has(m.created_by),
  );
  const past = ((pastRaw ?? []) as Row[]).filter(
    (m) => !blocked.has(m.created_by),
  );

  const ids = [...upcoming, ...past].map((m) => m.id);
  const hostedIds = new Set(
    [...upcoming, ...past].filter((m) => m.created_by === user.id).map((m) => m.id),
  );

  const [{ data: rsvps }, { data: invitesRaw }, { data: matchRows }] =
    await Promise.all([
      ids.length
        ? supabase
            .from("meetup_rsvps")
            .select("meetup_id, user_id, status")
            .in("meetup_id", ids)
        : Promise.resolve({
            data: [] as { meetup_id: string; user_id: string; status: string }[],
          }),
      ids.length
        ? supabase
            .from("meetup_invites")
            .select("meetup_id, status")
            .eq("invitee_id", user.id)
            .in("meetup_id", ids)
        : Promise.resolve({ data: [] as { meetup_id: string; status: string }[] }),
      supabase
        .from("matches")
        .select("id, profile_a_id, profile_b_id")
        .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`),
    ]);

  // Every count / roster figure below is SEATS ONLY. A 'requested' row is a
  // knock at the door; counting it would tell the room it is fuller than it is.
  const countBy = new Map<string, number>();
  const goersBy = new Map<string, string[]>();
  const mineBy = new Map<string, MyRsvp>();
  const requestersBy = new Map<string, string[]>();
  const upcomingIds = new Set(upcoming.map((m) => m.id));
  const nearbyIds: string[] = [];
  for (const r of rsvps ?? []) {
    const seat = r.status === "going";
    if (seat) {
      countBy.set(r.meetup_id, (countBy.get(r.meetup_id) ?? 0) + 1);
      const g = goersBy.get(r.meetup_id) ?? [];
      if (g.length < 6) g.push(r.user_id);
      goersBy.set(r.meetup_id, g);
      if (upcomingIds.has(r.meetup_id) && !nearbyIds.includes(r.user_id))
        nearbyIds.push(r.user_id);
    } else if (hostedIds.has(r.meetup_id) && !blocked.has(r.user_id)) {
      // Requesters are the HOST's business only, and a blocked pair never
      // reaches each other — not even as a name on a request row.
      requestersBy.set(r.meetup_id, [
        ...(requestersBy.get(r.meetup_id) ?? []),
        r.user_id,
      ]);
    }
    if (r.user_id === user.id) {
      mineBy.set(r.meetup_id, seat ? "going" : "requested");
    }
  }

  const inviteBy = new Map<string, InviteStatus>(
    (invitesRaw ?? []).map((i) => [
      i.meetup_id as string,
      i.status as InviteStatus,
    ]),
  );
  const matchByOther = new Map<string, string>();
  for (const mrow of matchRows ?? []) {
    const other =
      mrow.profile_a_id === user.id
        ? (mrow.profile_b_id as string)
        : (mrow.profile_a_id as string);
    matchByOther.set(other, mrow.id as string);
  }

  const faceIds = [
    ...new Set([
      ...[...goersBy.values()].flat(),
      ...[...requestersBy.values()].flat(),
      ...nearbyIds,
      ...upcoming.map((m) => m.created_by),
      ...past.map((m) => m.created_by),
    ]),
  ];
  const { data: faceRows } = faceIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url, slug")
        .in("id", faceIds)
    : { data: [] as MiniProfile[] };
  const faces = new Map((faceRows ?? []).map((p) => [p.id, p as MiniProfile]));

  const toItem = (m: Row): MeetupItemData => {
    const host = faces.get(m.created_by) ?? null;
    const mine = mineBy.get(m.id) ?? "none";
    const isHost = m.created_by === user.id;
    // Private meetups are LISTED now, so being unlisted is no longer what
    // protects their contents — attendance is. The meeting link especially:
    // for an online meetup the URL IS the door, so shipping it to every member
    // of the listing would make "the host chooses who joins" decorative. The
    // description stays — it is what a founder reads before knocking.
    const restricted = m.visibility === "private" && !isHost && mine !== "going";
    return {
      ...m,
      location: restricted ? null : m.location,
      online_url: restricted ? null : m.online_url,
      lat: restricted ? null : m.lat,
      lng: restricted ? null : m.lng,
      restricted,
      count: countBy.get(m.id) ?? 0,
      goers: (goersBy.get(m.id) ?? [])
        .map((id) => faces.get(id))
        .filter(Boolean) as MiniProfile[],
      host,
      mine,
      invite: inviteBy.get(m.id) ?? null,
      isHost,
      hostMatchId: matchByOther.get(m.created_by) ?? null,
      hostSlug: host?.slug ?? m.created_by,
      requesters: (requestersBy.get(m.id) ?? [])
        .map((id) => faces.get(id))
        .filter(Boolean) as JoinPerson[],
    };
  };

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
