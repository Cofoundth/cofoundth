import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  Lock,
  MapPin,
  Video,
  Users,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { nowISO } from "@/lib/time";
import { requireUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { tServer } from "@/lib/i18n-server";
import {
  MEETUP_CATEGORIES,
  MEETUP_TOPICS,
  meetupCoverUrl,
  meetupWhenParts,
  meetupPhase,
  meetupCalendarUrl,
  type Meetup,
} from "@/lib/meetups";
import { loadMeetupChat, privateMeetupVenues } from "@/lib/meetup-data";
import { Avatar } from "@/components/Avatar";
import { MeetupChat } from "./MeetupChat";
import { CancelHostedMeetup } from "./CancelHostedMeetup";
import { getLocale } from "@/lib/i18n-server";
import { EmptyState, LinkButton } from "@/components/ui";
import {
  MeetupJoinControls,
  type JoinPerson,
} from "../MeetupJoinControls";
import type { InviteStatus, MyRsvp } from "../actions";
import { getAccountRole } from "@/lib/account";
import { canHostMeetup, canRsvpMeetup } from "@/lib/roles";
import { getBlockedIds } from "@/lib/blocking";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data } = await supabase
    .from("meetups")
    .select("title")
    .eq("slug", slug)
    .maybeSingle();
  // Bare title — the root layout's "%s · Cofoundee" template adds the suffix.
  return { title: data?.title ?? "Meetup" };
}

type AttendeeRow = {
  user_id: string;
  status: string;
  profile: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    slug: string | null;
  } | null;
};

export default async function MeetupDetailPage({ params }: Props) {
  const { slug } = await params;
  const user = await requireUser();
  const supabase = await createClient();

  const { data: meetup } = await supabase
    .from("meetups")
    .select(
      "id, slug, title, description, format, location, online_url, starts_at, ends_at, capacity, status, category, topic, image_url, visibility, lat, lng, created_by, created_at, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!meetup) notFound();
  const m = meetup as Meetup;

  const [
    { data: attendeesRaw },
    admin,
    role,
    { data: host },
    blocked,
    { data: inviteRow },
    { data: matchRows },
  ] = await Promise.all([
    // The roster embeds the profile with NO role pin, deliberately: an explorer
    // can RSVP, and an attendee who came to try things must show up in the
    // room. Do not add a founder filter here — that pin belongs to the
    // directory queries (/browse, lib/public-profile.ts), not to this one.
    supabase
      .from("meetup_rsvps")
      .select("user_id, status, profile:profiles(id, full_name, photo_url, slug)")
      .eq("meetup_id", m.id)
      .order("created_at", { ascending: true }),
    isAdminUser(supabase, user),
    getAccountRole(supabase, user.id),
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, slug")
      .eq("id", m.created_by)
      .maybeSingle(),
    getBlockedIds(user.id),
    supabase
      .from("meetup_invites")
      .select("status")
      .eq("meetup_id", m.id)
      .eq("invitee_id", user.id)
      .maybeSingle(),
    supabase
      .from("matches")
      .select("id, profile_a_id, profile_b_id")
      .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`),
  ]);

  // A blocked host takes the whole meetup with them — there is no version of
  // this page that doesn't put the two of you in the same room.
  if (blocked.has(m.created_by)) notFound();

  // TWO capabilities, two props — the door and the invite panel are different
  // questions. An explorer may RSVP and attend but may NOT host or invite, so
  // MeetupJoinControls takes both rather than one `investor` boolean it would
  // have to answer both questions with.
  const canRsvp = canRsvpMeetup(role);
  const canHost = canHostMeetup(role);

  const allRows = (attendeesRaw ?? []) as unknown as AttendeeRow[];
  // SEATS only. Since 0072 a meetup_rsvps row is either a seat ('going') or a
  // knock at the door ('requested'); the roster, the count and the chat gate
  // all mean the first one.
  const allAttendees = allRows.filter((a) => a.status === "going");
  // The COUNT stays honest (it is the room's size, and rsvpAction returns the
  // unfiltered figure — a filtered one here would flicker on RSVP); only the
  // faces the viewer sees are filtered.
  const count = allAttendees.length;
  const going = allAttendees.some((a) => a.user_id === user.id);
  const attendees = allAttendees.filter(
    (a) => !blocked.has(a.user_id),
  );
  const isHost = m.created_by === user.id;
  // Private meetups are LISTED since 0072, so being undiscoverable is no
  // longer what protects their contents — attendance is. For an online private
  // meetup the URL *is* the door: handing it to every member who opens the
  // page would make the host's approval decorative. Everything else on the
  // page (title, description, when, who's going) stays readable — that is what
  // someone decides to knock on.
  const restricted = m.visibility === "private" && !isHost && !going;
  const venues = await privateMeetupVenues(supabase, m.visibility === "private" && !restricted ? [m.id] : []);
  const mSafe = restricted
    ? { ...m, location: null, online_url: null, lat: null, lng: null }
    : { ...m, ...venues.get(m.id) };
  const mineStatus: MyRsvp = going
    ? "going"
    : allRows.some((a) => a.user_id === user.id)
      ? "requested"
      : "none";
  // Requests are the HOST's business, and a blocked pair never reaches each
  // other — not even as a name on a request row.
  const requesters: JoinPerson[] = isHost
    ? allRows
        .filter(
          (a) =>
            a.status === "requested" && a.profile && !blocked.has(a.user_id),
        )
        .map((a) => ({
          id: a.user_id,
          slug: a.profile?.slug ?? null,
          full_name: a.profile?.full_name ?? null,
          photo_url: a.profile?.photo_url ?? null,
        }))
    : [];
  const hostMatchId =
    (matchRows ?? []).find(
      (row) =>
        (row.profile_a_id as string) === m.created_by ||
        (row.profile_b_id as string) === m.created_by,
    )?.id ?? null;

  const cancelled = m.status === "cancelled";
  const phase = meetupPhase(m, Date.parse(nowISO()));
  const upcoming = phase === "upcoming";
  const canManage = isHost && canHost && !cancelled && phase !== "ended";
  const when = meetupWhenParts(m.starts_at);
  const endTime = m.ends_at ? meetupWhenParts(m.ends_at).time : null;

  const [
    tBack,
    tCancelledBanner,
    tEnded,
    tWhen,
    tWhere,
    tOnline,
    tJoinOnline,
    tTba,
    tWhosGoing,
    tGoing,
    tNobody,
    tNobodyClosed,
    tNobodyReadOnly,
    tAddCal,
    tFull,
    tEdit,
  ] = await Promise.all([
    tServer("Back to meetups"),
    tServer("This meetup was cancelled."),
    tServer("This meetup has ended."),
    tServer("When"),
    tServer("Where"),
    tServer("Online"),
    tServer("Join online"),
    tServer("To be announced"),
    tServer("Who's going"),
    tServer("going"),
    tServer("Be the first to RSVP."),
    tServer("Nobody RSVP'd to this one."),
    tServer("No one has RSVP'd yet."),
    tServer("Add to Calendar"),
    tServer("This meetup is full."),
    tServer("Edit meetup"),
  ]);
  const tShared = await tServer("Shared once you're in");

  const spotsFull = m.capacity != null && !going && count >= m.capacity;
  const cat = MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other;
  const chatMessages = going && !cancelled
    ? await loadMeetupChat(supabase, m.id, blocked) ?? []
    : [];
  const locale = await getLocale();
  const tChatTitle = await tServer("Attendee chat");
  const tChatLocked = await tServer(
    "Join the meetup to chat with the attendees.",
  );
  const tHostedBy = await tServer("Hosted by {name}");
  const tCatLabel = await tServer(cat.label);
  // The topic is nullable — every meetup created before the wizard's step 2
  // existed has none, and those rows must still render.
  const topic = m.topic ? MEETUP_TOPICS[m.topic] : null;
  const tTopicLabel = topic ? await tServer(topic.label) : null;
  const tPrivate = await tServer("Private");

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-14">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href="/meetups"
          className="text-sm text-ink-muted hover:text-navy inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> {tBack}
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {((canManage && upcoming) || admin) && (
            <LinkButton
              href={canManage && upcoming ? `/meetups/${m.slug}/edit` : `/admin/meetups/${m.id}/edit`}
              variant="secondary"
              size="sm"
            >
              <Pencil className="h-4 w-4" /> {tEdit}
            </LinkButton>
          )}
          {canManage && <CancelHostedMeetup meetupId={m.id} />}
        </div>
      </div>

      {/* Cover — the host's upload, else the category artwork. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meetupCoverUrl(m)}
        alt=""
        className="mb-8 h-48 w-full rounded-3xl object-cover bg-gold-soft"
      />

      <h1 className="text-d2 mb-2">{m.title}</h1>

      {/* Category + host — the two lines Onfound's event page leads with. */}
      <div className="mb-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-ink-muted">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-2.5 py-0.5 text-xs text-gold-ink">
          <span aria-hidden="true">{cat.emoji}</span> {tCatLabel}
        </span>
        {tTopicLabel && (
          <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-xs text-ink">
            {tTopicLabel}
          </span>
        )}
        {m.visibility === "private" && (
          // The same chip the dialog renders, down to the vector lock: an OS
          // emoji here and a lucide icon there is one chip with two faces.
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-2.5 py-0.5 text-xs text-white">
            <Lock className="h-3 w-3" /> {tPrivate}
          </span>
        )}
        {host && (
          <Link
            href={`/profile/${(host.slug as string | null) ?? (host.id as string)}`}
            className="inline-flex items-center gap-2 hover:text-navy transition-colors"
          >
            <Avatar
              name={host.full_name as string}
              url={host.photo_url as string | null}
              size="sm"
            />
            {tHostedBy.replace("{name}", (host.full_name as string) ?? "—")}
          </Link>
        )}
      </div>

      {cancelled && (
        <div className="mb-6 px-4 py-3 border border-danger-line rounded-xl bg-danger-surface text-sm text-danger-ink">
          {tCancelledBanner}
        </div>
      )}
      {!cancelled && !upcoming && (
        <div className="mb-6 px-4 py-3 border border-line rounded-xl bg-cream text-sm text-ink-muted">
          {phase === "ongoing" ? await tServer("This meetup is in progress.") : tEnded}
        </div>
      )}

      {/* When / Where */}
      <div className="grid sm:grid-cols-2 gap-6 mb-8 pb-8 border-b border-line">
        <div>
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
            {tWhen}
          </div>
          <div className="flex items-start gap-2 text-ink">
            <CalendarClock className="w-4 h-4 mt-0.5 text-gold-ink shrink-0" />
            <div>
              {when.weekday}, {when.day} {when.monthYear}
              <br />
              {when.time}
              {endTime ? ` – ${endTime}` : ""}
            </div>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
            {tWhere}
          </div>
          <div className="flex items-start gap-2 text-ink">
            {m.format === "online" ? (
              <Video className="w-4 h-4 mt-0.5 text-gold-ink shrink-0" />
            ) : (
              <MapPin className="w-4 h-4 mt-0.5 text-gold-ink shrink-0" />
            )}
            <div>
              {restricted ? (
                tShared
              ) : m.format === "online" ? (
                <>
                  {tOnline}
                  {!cancelled && mSafe.online_url && (
                    <>
                      <br />
                      <a
                        href={mSafe.online_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-navy hover:text-gold-ink inline-flex items-center gap-1 break-all"
                      >
                        {tJoinOnline} <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    </>
                  )}
                </>
              ) : (
                mSafe.location || tTba
              )}
            </div>
          </div>
        </div>
      </div>

      {m.description && (
        <div className="text-ink leading-relaxed whitespace-pre-line mb-10">
          {m.description}
        </div>
      )}

      {/* Actions — the same door component the /meetups dialog renders, so
          the two surfaces cannot disagree about what private means. */}
      <div className="mb-12 space-y-4">
        <MeetupJoinControls
          meetupId={m.id}
          canRsvp={canRsvp}
          canHost={canHost}
          closed={cancelled || !upcoming}
          state={{
            isHost,
            mine: mineStatus,
            invite: (inviteRow?.status as InviteStatus | undefined) ?? null,
            count,
            capacity: m.capacity,
            visibility:
              m.visibility === "private" ? "private" : "public",
            hostMatchId: (hostMatchId as string | null) ?? null,
            hostSlug: (host?.slug as string | null) ?? m.created_by,
            requesters,
          }}
        />
        {!cancelled && upcoming && (
          <LinkButton
            href={meetupCalendarUrl(mSafe)}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="md"
          >
            <CalendarPlus className="w-4 h-4" /> {tAddCal}
          </LinkButton>
        )}
      </div>

      {/* Attendees */}
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink-muted mb-4">
          <Users className="w-4 h-4" />
          {tWhosGoing} · {count}
          {m.capacity != null ? `/${m.capacity}` : ""} {tGoing}
          {spotsFull && upcoming && !cancelled && (
            <span className="text-danger-ink normal-case tracking-normal">
              — {tFull}
            </span>
          )}
        </div>
        {count === 0 ? (
          // KIND A — no attendees yet. "Be the first" is only honest when the
          // reader can actually RSVP: a past or cancelled meetup can't be
          // joined, and read-only accounts have RSVP refused server-side.
          <EmptyState
            dense
            padding="lg"
            description={
              !upcoming || cancelled
                ? tNobodyClosed
                : !canRsvp
                  ? tNobodyReadOnly
                  : tNobody
            }
          />
        ) : (
          <div className="flex flex-wrap gap-3">
            {attendees.map((a) => {
              const p = a.profile;
              const name = p?.full_name ?? "Founder";
              const href = p ? `/profile/${p.slug ?? p.id}` : null;
              const avatar = (
                <div className="flex flex-col items-center gap-1.5 w-16 text-center">
                  <Avatar name={name} url={p?.photo_url ?? null} size="md" />
                  <span className="text-xs text-ink-muted truncate w-full">
                    {name.split(" ")[0]}
                  </span>
                </div>
              );
              return href ? (
                <Link
                  key={a.user_id}
                  href={href}
                  className="hover:opacity-80 transition-opacity"
                >
                  {avatar}
                </Link>
              ) : (
                <div key={a.user_id}>{avatar}</div>
              );
            })}
          </div>
        )}
      </div>

      {/* Attendee chat — the reference app's Messages > Meetups thread,
          mounted where the attendees already are. */}
      {!cancelled && (
        <div className="mt-8 pt-8 border-t border-line">
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
            {tChatTitle}
          </div>
          {going ? (
            <MeetupChat
              meetupId={m.id}
              initialMessages={chatMessages}
              locale={locale}
            />
          ) : (
            <p className="text-sm text-ink-muted">{tChatLocked}</p>
          )}
        </div>
      )}
    </div>
  );
}
