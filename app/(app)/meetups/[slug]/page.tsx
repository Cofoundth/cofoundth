import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarClock,
  CalendarPlus,
  MapPin,
  Video,
  Users,
  ExternalLink,
  Pencil,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin";
import { tServer } from "@/lib/i18n-server";
import {
  MEETUP_CATEGORIES,
  meetupCoverUrl,
  meetupWhenParts,
  meetupCalendarUrl,
  type Meetup,
} from "@/lib/meetups";
import { isPast } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { MeetupChat, type ChatMessage } from "./MeetupChat";
import { getLocale } from "@/lib/i18n-server";
import { EmptyState, LinkButton } from "@/components/ui";
import { RsvpButton } from "../RsvpButton";
import { isInvestorAccount } from "@/lib/account";
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
  return { title: data?.title ? `${data.title} · Cofoundee` : "Meetup" };
}

type AttendeeRow = {
  user_id: string;
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
      "id, slug, title, description, format, location, online_url, starts_at, ends_at, capacity, status, category, image_url, visibility, lat, lng, created_by, created_at, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!meetup) notFound();
  const m = meetup as Meetup;

  const [{ data: attendeesRaw }, admin, investor, { data: host }, blocked] = await Promise.all([
    supabase
      .from("meetup_rsvps")
      .select("user_id, profile:profiles(id, full_name, photo_url, slug)")
      .eq("meetup_id", m.id)
      .order("created_at", { ascending: true }),
    isAdminUser(supabase, user),
    isInvestorAccount(supabase, user.id),
    supabase
      .from("profiles")
      .select("id, full_name, photo_url, slug")
      .eq("id", m.created_by)
      .maybeSingle(),
    getBlockedIds(user.id),
  ]);

  // A blocked host takes the whole meetup with them — there is no version of
  // this page that doesn't put the two of you in the same room.
  if (blocked.has(m.created_by)) notFound();

  const allAttendees = (attendeesRaw ?? []) as unknown as AttendeeRow[];
  // The COUNT stays honest (it is the room's size, and rsvpAction returns the
  // unfiltered figure — a filtered one here would flicker on RSVP); only the
  // faces the viewer sees are filtered.
  const count = allAttendees.length;
  const going = allAttendees.some((a) => a.user_id === user.id);
  const attendees = allAttendees.filter(
    (a) => !blocked.has(a.user_id),
  );

  const cancelled = m.status === "cancelled";
  const past = isPast(m.starts_at);
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
    tServer("Edit"),
  ]);

  const spotsFull = m.capacity != null && !going && count >= m.capacity;
  const cat = MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other;
  // Attendee chat — RLS returns rows only when the viewer has an RSVP, so a
  // non-attendee simply gets an empty list and we show the locked hint.
  const { data: chatRaw } = await supabase
    .from("meetup_messages")
    .select(
      "id, content, created_at, author:profiles(id, slug, full_name, photo_url)",
    )
    .eq("meetup_id", m.id)
    .order("created_at", { ascending: true })
    .limit(200);
  const chatMessages = ((chatRaw ?? []) as unknown as ChatMessage[]).filter(
    (msg) => !msg.author || !blocked.has(msg.author.id),
  );
  const locale = await getLocale();
  const tChatTitle = await tServer("Attendee chat");
  const tChatLocked = await tServer(
    "Join the meetup to chat with the attendees.",
  );
  const tHostedBy = await tServer("Hosted by {name}");
  const tCatLabel = await tServer(cat.label);
  const tPrivate = await tServer("Only people with the link");

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-[88px]">
      <div className="flex items-center justify-between mb-8">
        <Link
          href="/meetups"
          className="text-sm text-ink-muted hover:text-navy inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> {tBack}
        </Link>
        {admin && (
          <Link
            href={`/admin/meetups/${m.id}/edit`}
            className="text-sm text-ink-muted hover:text-navy inline-flex items-center gap-1.5"
          >
            <Pencil className="w-3.5 h-3.5" /> {tEdit}
          </Link>
        )}
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
        {m.visibility === "private" && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-navy px-2.5 py-0.5 text-xs text-white">
            🔒 {tPrivate}
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
      {!cancelled && past && (
        <div className="mb-6 px-4 py-3 border border-line rounded-xl bg-cream text-sm text-ink-muted">
          {tEnded}
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
              {m.format === "online" ? (
                <>
                  {tOnline}
                  {m.online_url && (
                    <>
                      <br />
                      <a
                        href={m.online_url}
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
                m.location || tTba
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

      {/* Actions */}
      {!cancelled && !past && (
        <div className="flex flex-wrap items-center gap-4 mb-12">
          {!investor && (
            <RsvpButton
              meetupId={m.id}
              initialGoing={going}
              goingCount={count}
              capacity={m.capacity}
            />
          )}
          <LinkButton
            href={meetupCalendarUrl(m)}
            target="_blank"
            rel="noopener noreferrer"
            variant="secondary"
            size="md"
          >
            <CalendarPlus className="w-4 h-4" /> {tAddCal}
          </LinkButton>
        </div>
      )}

      {/* Attendees */}
      <div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-ink-muted mb-4">
          <Users className="w-4 h-4" />
          {tWhosGoing} · {count}
          {m.capacity != null ? `/${m.capacity}` : ""} {tGoing}
          {spotsFull && !past && !cancelled && (
            <span className="text-danger-ink normal-case tracking-normal">
              — {tFull}
            </span>
          )}
        </div>
        {count === 0 ? (
          // KIND A — no attendees yet. "Be the first" is only honest when the
          // reader can actually RSVP: a past or cancelled meetup can't be
          // joined, and investors have RSVP refused server-side.
          <EmptyState
            dense
            padding="lg"
            description={
              past || cancelled
                ? tNobodyClosed
                : investor
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
              messages={chatMessages}
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
