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
  meetupWhenParts,
  meetupCalendarUrl,
  type Meetup,
} from "@/lib/meetups";
import { isPast } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { LinkButton } from "@/components/ui";
import { RsvpButton } from "../RsvpButton";
import { isInvestorAccount } from "@/lib/account";

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
      "id, slug, title, description, format, location, online_url, starts_at, ends_at, capacity, status, created_by, created_at, updated_at",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!meetup) notFound();
  const m = meetup as Meetup;

  const [{ data: attendeesRaw }, admin, investor] = await Promise.all([
    supabase
      .from("meetup_rsvps")
      .select("user_id, profile:profiles(id, full_name, photo_url, slug)")
      .eq("meetup_id", m.id)
      .order("created_at", { ascending: true }),
    isAdminUser(supabase, user),
    isInvestorAccount(supabase, user.id),
  ]);

  const attendees = (attendeesRaw ?? []) as unknown as AttendeeRow[];
  const count = attendees.length;
  const going = attendees.some((a) => a.user_id === user.id);

  const cancelled = m.status === "cancelled";
  const past = isPast(m.starts_at);
  const when = meetupWhenParts(m.starts_at);
  const endTime = m.ends_at ? meetupWhenParts(m.ends_at).time : null;

  const [
    tBack,
    tCommunity,
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
    tAddCal,
    tFull,
    tEdit,
  ] = await Promise.all([
    tServer("Back to meetups"),
    tServer("Community"),
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
    tServer("Add to Calendar"),
    tServer("This meetup is full."),
    tServer("Edit"),
  ]);

  const spotsFull = m.capacity != null && !going && count >= m.capacity;

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

      <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-4">
        {tCommunity}
      </div>
      <h1 className="text-d3 leading-tight mb-6">{m.title}</h1>

      {cancelled && (
        <div className="mb-6 px-4 py-3 border border-red-300 rounded-xl bg-red-50 text-sm text-red-800">
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
            <span className="text-red-800 normal-case tracking-normal">
              — {tFull}
            </span>
          )}
        </div>
        {count === 0 ? (
          <p className="text-sm text-ink-muted">{tNobody}</p>
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
    </div>
  );
}
