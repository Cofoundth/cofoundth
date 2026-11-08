"use client";

// The meetups page's interaction layer, matched to the reference product's:
// nothing here navigates. A card opens a DIALOG with Join inside it, Create
// opens the wizard modal, List/Map toggles instantly, and the header's
// founder pile opens the roster. The /meetups/[slug] page still exists for
// deep links — this component is how the LISTED calendar behaves, private
// meetups included (0072: private means the host picks, not "unlisted").
//
// The server page fetches everything and hands it over serialised; every
// mutation goes back through the same server actions the detail page uses
// (rsvpAction / reportMeetupAction), with optimistic going/count updates.

import { useId, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  Check,
  ExternalLink,
  Flag,
  List as ListIcon,
  Lock,
  Map as MapIcon,
  MapPin,
  Plus,
  Video,
} from "lucide-react";
import { useT } from "@/lib/i18n-client";
import {
  MEETUP_CATEGORIES,
  MEETUP_TOPICS,
  meetupCalendarUrl,
  meetupCoverUrl,
  meetupWhenParts,
  type MeetupCategory,
  type MeetupFormat,
  type MeetupTopic,
} from "@/lib/meetups";
import { colorFor, getInitials } from "@/components/Avatar";
import { MeetupMap, type MeetupPin } from "@/components/MeetupMap";
import { Button, Card, CardChip, Dialog, EmptyState, ToggleChip } from "@/components/ui";
import { reportMeetupAction, type InviteStatus, type MyRsvp } from "./actions";
import {
  MeetupJoinControls,
  type JoinPerson,
} from "./MeetupJoinControls";
import { HostMeetupWizard } from "./HostMeetupWizard";

export type MiniProfile = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
  slug: string | null;
};

export type MeetupItemData = {
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
  status: string;
  category: MeetupCategory;
  topic: MeetupTopic | null;
  image_url: string | null;
  visibility: "public" | "private";
  lat: number | null;
  lng: number | null;
  /**
   * A private meetup the viewer is not in. Private is LISTED since 0072, so
   * the where/link/pin have to be withheld by attendance instead of by
   * discovery — the server nulls them out too, this only says why the copy
   * reads the way it does.
   */
  restricted: boolean;
  /** SEATS only — a 'requested' row is a knock, never a head count. */
  count: number;
  goers: MiniProfile[];
  host: MiniProfile | null;
  /** The viewer's own row. */
  mine: MyRsvp;
  invite: InviteStatus | null;
  isHost: boolean;
  hostMatchId: string | null;
  hostSlug: string | null;
  /** Host view only: who is waiting at the door. */
  requesters: JoinPerson[];
};

function MiniFace({ p, size = 24 }: { p: MiniProfile; size?: number }) {
  const cls = `rounded-full object-cover`;
  return p.photo_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={p.photo_url}
      alt={p.full_name ?? ""}
      style={{ width: size, height: size }}
      className={cls}
    />
  ) : (
    <span
      style={{ width: size, height: size, backgroundColor: colorFor(p.full_name) }}
      className="rounded-full grid place-items-center text-[11px] text-white font-serif"
    >
      {getInitials(p.full_name).charAt(0)}
    </span>
  );
}

// TWO CAPABILITIES, TWO PROPS — the same note as on MeetupJoinControls. The
// single `investor` boolean these replace drove the three "Create a meetup"
// affordances AND (down through MeetupDialog) the RSVP door, which only held
// together while the one gated role could do neither. An EXPLORER may RSVP and
// may NOT host, so each affordance below asks the question that applies to it:
// the create buttons read `canHost`, the door reads `canRsvp`.
export function MeetupsClient({
  thisMonth,
  later,
  past,
  nearby,
  canRsvp,
  canHost,
  initialCreate,
}: {
  thisMonth: MeetupItemData[];
  later: MeetupItemData[];
  past: MeetupItemData[];
  nearby: MiniProfile[];
  /** May take a seat at a meetup. canRsvpMeetup. */
  canRsvp: boolean;
  /** May host one, and therefore may invite to one. canHostMeetup. */
  canHost: boolean;
  initialCreate: boolean;
}) {
  const tr = useT();
  const [view, setView] = useState<"list" | "map">("list");
  // The open dialog is held by ID, not by a captured object. A snapshot went
  // stale the moment anything it showed changed on the server — the host's
  // requester list, an invite's status — because `revalidatePath` refreshes
  // these props while a captured object keeps whatever it was opened with, for
  // the whole life of the dialog.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(initialCreate);
  const [rosterOpen, setRosterOpen] = useState(false);
  const rosterTitleId = useId();
  // id → optimistic {mine, count} overrides after a join/request round-trip.
  const [over, setOver] = useState<Record<string, { mine: MyRsvp; count: number }>>(
    {},
  );

  const upcoming = [...thisMonth, ...later];
  const hasUpcoming = upcoming.length > 0;
  // With the toggle hidden, a map chosen before the last meetup dropped off
  // (a revalidate after a cancel) must not strand the viewer on an empty map.
  const shownView = hasUpcoming ? view : "list";
  const withOver = (m: MeetupItemData): MeetupItemData =>
    over[m.id] ? { ...m, ...over[m.id] } : m;
  const selected = selectedId
    ? ([...upcoming, ...past].find((m) => m.id === selectedId) ?? null)
    : null;

  const pins: MeetupPin[] = upcoming
    .filter((m) => m.lat != null && m.lng != null && m.status !== "cancelled")
    .map((m) => ({
      slug: m.slug,
      title: m.title,
      lat: m.lat as number,
      lng: m.lng as number,
      emoji: (MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other).emoji,
    }));

  const card = (m: MeetupItemData, opts?: { past?: boolean; strip?: boolean }) => (
    <MeetupCard
      key={m.id}
      m={withOver(m)}
      onOpen={() => setSelectedId(m.id)}
      past={opts?.past}
      strip={opts?.strip}
    />
  );

  return (
    <>
      <div className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <h1 className="text-d2">{tr("Meetups")}</h1>
          {nearby.length > 0 && (
            <button
              type="button"
              onClick={() => setRosterOpen(true)}
              className="mt-2 flex items-center gap-2.5 group"
            >
              <span className="flex -space-x-1.5">
                {nearby.slice(0, 5).map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full ring-2 ring-cream inline-flex"
                  >
                    <MiniFace p={p} />
                  </span>
                ))}
              </span>
              <span className="text-sm text-ink-muted group-hover:text-navy transition-colors">
                {tr("{n} founders joining meetups").replace(
                  "{n}",
                  String(nearby.length),
                )}
              </span>
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Nothing upcoming = nothing to list or map; the empty state
              already carries the one useful action. */}
          {hasUpcoming && (
            <>
              {/* The icons ride as CHILDREN, not through ToggleChip's `icon`
                  prop: that prop renders them at strokeWidth 1.5 and these
                  have always been the lucide default. */}
              <ToggleChip
                selected={view === "list"}
                onClick={() => setView("list")}
              >
                <ListIcon className="w-3.5 h-3.5" /> {tr("List")}
              </ToggleChip>
              <ToggleChip
                selected={view === "map"}
                onClick={() => setView("map")}
              >
                <MapIcon className="w-3.5 h-3.5" /> {tr("Map")}
              </ToggleChip>
            </>
          )}
          {/* `py-1.5 tracking-normal` holds this button's exact pixels:
              size="sm" is px-4 py-2 + tracking-wide, and both overrides now
              win because cn() merges. */}
          {canHost && (
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="py-1.5 tracking-normal"
            >
              <Plus className="w-4 h-4" />
              {tr("Create a meetup")}
            </Button>
          )}
        </div>
      </div>

      {shownView === "map" ? (
        <div>
          <MeetupMap pins={pins} />
          {pins.length === 0 && (
            <p className="mt-4 text-sm text-ink-muted">
              {tr("Meetups with a map pin show up here.")}
            </p>
          )}
        </div>
      ) : !hasUpcoming ? (
        <EmptyState
          icon={Calendar}
          title={tr("No meetups on the calendar")}
          // The description follows the BUTTON, not the other way round. The
          // founder copy is a call to host, and with canHost false there is no
          // host button under it — so an explorer was being told to do the one
          // thing this page refuses them. Same split as the action below.
          description={
            canHost
              ? tr(
                  "Want to meet founders in person? Host the first one — every member will see it.",
                )
              : tr(
                  "Nothing scheduled yet. When a founder hosts one, it shows up here and you can grab a seat.",
                )
          }
          action={
            canHost ? (
              <Button
                onClick={() => setCreateOpen(true)}
                className="tracking-normal"
              >
                {tr("Host the first meetup")}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          {thisMonth.length > 0 && (
            <section>
              <h2 className="text-lg font-bold tracking-normal mb-5">
                {tr("This month")}
              </h2>
              <div className="flex gap-4 overflow-x-auto pb-2 snap-x">
                {thisMonth.map((m) => card(m, { strip: true }))}
                {canHost && (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className="snap-start shrink-0 w-[300px] min-w-0 rounded-3xl bg-navy p-6 flex flex-col justify-center text-left hover:bg-navy-dark transition-colors"
                  >
                    <span className="text-3xl mb-3" aria-hidden="true">
                      ✨
                    </span>
                    <span className="text-white font-semibold leading-snug">
                      {tr("Create your own meetup")}
                    </span>
                    <span className="text-white/70 text-sm mt-1 leading-relaxed">
                      {tr("and every founder on Cofoundee will see it")}
                    </span>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm text-gold">
                      {tr("Create a meetup")} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </button>
                )}
              </div>
            </section>
          )}
          {later.length > 0 && (
            <section className={thisMonth.length > 0 ? "mt-14" : ""}>
              <h2 className="text-lg font-bold tracking-normal mb-5">
                {tr("Upcoming")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {later.map((m) => card(m))}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section className="mt-14">
              <h2 className="text-lg font-bold tracking-normal mb-5">
                {tr("Past meetups")}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {past.map((m) => card(m, { past: true }))}
              </div>
            </section>
          )}
        </>
      )}

      {selected && (
        <MeetupDialog
          m={withOver(selected)}
          canRsvp={canRsvp}
          canHost={canHost}
          onClose={() => setSelectedId(null)}
          onRsvp={(id, next) => setOver((o) => ({ ...o, [id]: next }))}
        />
      )}

      {createOpen && (
        // dismissible={false} is load-bearing, not a preference: the wizard is
        // ONE <form> holding a cover <input type="file">, and a File cannot be
        // rebuilt from state. A stray backdrop click must not throw away a
        // half-filled form, so the wizard owns its own Exit affordance and
        // routes it through the discard confirm. Escape is left doing nothing
        // (today's behaviour) — routing it is a follow-up, and it must not
        // fire while the location sheet is open.
        <Dialog
          onClose={() => setCreateOpen(false)}
          ariaLabel={tr("Host a meetup")}
          size="narrow"
          padding="none"
          surface="overlay"
          dismissible={false}
          panelClassName="my-8"
        >
          <HostMeetupWizard inModal onClose={() => setCreateOpen(false)} />
        </Dialog>
      )}

      {rosterOpen && (
        <Dialog
          onClose={() => setRosterOpen(false)}
          labelledBy={rosterTitleId}
          size="lg"
          padding="none"
          surface="overlay"
          closeButton="overlay"
          closeLabel={tr("Close")}
          panelClassName="my-8"
        >
          <div className="p-6">
            <h2 id={rosterTitleId} className="text-xl mb-5">
              {tr("{n} founders joining meetups").replace(
                "{n}",
                String(nearby.length),
              )}
            </h2>
            <div className="divide-y divide-line">
              {nearby.map((p) => (
                <div key={p.id} className="flex items-center gap-3 py-3">
                  <MiniFace p={p} size={36} />
                  <span className="text-sm text-ink truncate">
                    {p.full_name ?? "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

function MeetupCard({
  m,
  onOpen,
  past,
  strip,
}: {
  m: MeetupItemData;
  onOpen: () => void;
  past?: boolean;
  strip?: boolean;
}) {
  const tr = useT();
  const when = meetupWhenParts(m.starts_at);
  const cancelled = m.status === "cancelled";
  const cat = MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other;
  const where = m.restricted
    ? tr("Shared once you're in")
    : m.format === "online"
      ? tr("Online")
      : m.location ?? tr("In person");
  const spotsLeft = m.capacity != null ? Math.max(0, m.capacity - m.count) : null;

  return (
    // A BUTTON, like theirs — the card opens the dialog, not a page.
    <button
      type="button"
      onClick={onOpen}
      className={`group block min-w-0 text-left rounded-3xl ${
        strip ? "snap-start shrink-0 w-[300px]" : "h-full w-full"
      } ${past ? "opacity-70" : ""}`}
    >
      <Card
        padding="none"
        hoverable
        className="h-full flex flex-col overflow-hidden"
      >
        <div className="relative h-32 shrink-0 bg-gold-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={meetupCoverUrl(m)}
            alt=""
            className="h-full w-full object-cover"
          />
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-white/90 text-ink">
            <span aria-hidden="true">{cat.emoji}</span>
            {tr(cat.label)}
          </span>
          {cancelled ? (
            <span className="absolute top-3 right-3 text-xs uppercase tracking-[0.15em] text-danger-ink bg-danger-surface border border-danger-line rounded-full px-2 py-0.5">
              {tr("Cancelled")}
            </span>
          ) : (
            m.visibility === "private" && (
              // Listed, but locked — the reference product's private card.
              <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-xs text-ink">
                <Lock className="h-3 w-3" /> {tr("Private")}
              </span>
            )
          )}
          {m.host && (
            <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/90 pl-1 pr-2.5 py-1 text-xs text-ink max-w-[85%]">
              <MiniFace p={m.host} />
              <span className="truncate">
                {tr("Hosted by {name}").replace(
                  "{name}",
                  m.host.full_name ?? "—",
                )}
              </span>
            </span>
          )}
        </div>

        <div className="p-5 flex flex-col flex-1 min-h-0">
          <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">
            {when.weekday} · {when.day} {when.monthYear} · {when.time}
          </div>
          <h3 className="text-xl mt-2 line-clamp-2 min-h-[56px]">{m.title}</h3>

          {/* What it is ABOUT, under what it IS. The category already leads on
              the cover; the topic is what a founder actually scans for. */}
          {m.topic && MEETUP_TOPICS[m.topic] && (
            <div className="mt-2">
              <CardChip>{tr(MEETUP_TOPICS[m.topic].label)}</CardChip>
            </div>
          )}

          <div className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted min-w-0">
            {m.format === "online" ? (
              <Video className="w-3 h-3 shrink-0" />
            ) : (
              <MapPin className="w-3 h-3 shrink-0" />
            )}
            <span className="truncate">{where}</span>
          </div>

          <div className="mt-auto pt-4 flex items-center gap-2 min-w-0">
            {m.goers.length > 0 && (
              <span className="flex -space-x-1.5 shrink-0">
                {m.goers.slice(0, 4).map((p) => (
                  <span
                    key={p.id}
                    className="rounded-full ring-2 ring-white inline-flex"
                  >
                    <MiniFace p={p} />
                  </span>
                ))}
              </span>
            )}
            <span className="text-xs text-ink-muted truncate">
              {m.count === 0 ? (
                tr("Be the first to join")
              ) : (
                <>
                  {m.count} {tr("going")}
                </>
              )}
            </span>
            {!cancelled && spotsLeft !== null && m.count > 0 && (
              <span
                className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${
                  spotsLeft === 0
                    ? "bg-navy text-white"
                    : "bg-gold-soft text-gold-ink"
                }`}
              >
                {spotsLeft === 0
                  ? tr("Fully booked")
                  : tr("{n} spots left").replace("{n}", String(spotsLeft))}
              </span>
            )}
            {m.mine === "going" && !cancelled && (
              <span className="shrink-0 inline-flex items-center gap-1 text-xs text-navy">
                <Check className="w-3 h-3" /> {tr("You're going")}
              </span>
            )}
            {m.mine === "requested" && !cancelled && (
              <span className="shrink-0 text-xs text-ink-muted">
                {tr("Requested")}
              </span>
            )}
            <span className="ml-auto shrink-0 w-8 h-8 rounded-full border border-line grid place-items-center text-ink group-hover:bg-navy group-hover:border-navy group-hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </Card>
    </button>
  );
}

function MeetupDialog({
  m,
  canRsvp,
  canHost,
  onClose,
  onRsvp,
}: {
  m: MeetupItemData;
  canRsvp: boolean;
  canHost: boolean;
  onClose: () => void;
  onRsvp: (id: string, next: { mine: MyRsvp; count: number }) => void;
}) {
  const tr = useT();
  const titleId = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [reportText, setReportText] = useState("");
  const [reported, setReported] = useState(false);
  // Captured once on mount — Date.now() in render is impure (react-hooks
  // rule), and a dialog lives for seconds, so one snapshot is enough.
  const [openedAt] = useState(() => Date.now());

  const when = meetupWhenParts(m.starts_at);
  const cat = MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other;
  const cancelled = m.status === "cancelled";
  const isPast = new Date(m.starts_at).getTime() < openedAt;
  // "Open" on the address, the way their dialog does it: the pin when the
  // host placed one, else a text search — never a geocode guess.
  const mapsUrl =
    m.lat != null && m.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
      : m.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`
        : null;

  async function sendReport() {
    setBusy(true);
    setError(null);
    const res = await reportMeetupAction(m.id, reportText);
    setBusy(false);
    if (res.error) {
      setError(tr(res.error));
      return;
    }
    setReported(true);
    setReporting(false);
  }

  return (
    <Dialog
      onClose={onClose}
      labelledBy={titleId}
      size="lg"
      padding="none"
      surface="overlay"
      closeButton="overlay"
      closeLabel={tr("Close")}
      panelClassName="my-8"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={meetupCoverUrl(m)}
        alt=""
        className="h-36 w-full rounded-t-xl object-cover bg-gold-soft"
      />
      <div className="p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="inline-flex items-center rounded-full bg-gold-soft px-2.5 py-0.5 text-gold-ink">
            {tr("Free")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-gold-soft px-2.5 py-0.5 text-gold-ink">
            <span aria-hidden="true">{cat.emoji}</span> {tr(cat.label)}
          </span>
          {/* What it is ABOUT, next to what it IS — the card and the [slug]
              page both lead with this pair, and the dialog is the surface a
              founder actually reads the meetup in. */}
          {m.topic && MEETUP_TOPICS[m.topic] && (
            <span className="inline-flex items-center rounded-full bg-navy/10 px-2.5 py-0.5 text-ink">
              {tr(MEETUP_TOPICS[m.topic].label)}
            </span>
          )}
          {m.visibility === "private" && (
            <span className="inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-0.5 text-white">
              <Lock className="h-3 w-3" /> {tr("Private")}
            </span>
          )}
          {cancelled && (
            <span className="inline-flex items-center rounded-full bg-danger-surface border border-danger-line px-2.5 py-0.5 text-danger-ink">
              {tr("Cancelled")}
            </span>
          )}
        </div>

        <h2 id={titleId} className="text-xl mb-4">
          {m.title}
        </h2>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink min-w-0">
              <Calendar className="w-4 h-4 text-gold-ink shrink-0" />
              <span className="truncate">
                {when.weekday}, {when.day} {when.monthYear} · {when.time}
              </span>
            </span>
            <a
              href={meetupCalendarUrl(m)}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 inline-flex items-center gap-1 text-xs text-navy hover:text-gold-ink"
            >
              <CalendarPlus className="w-3.5 h-3.5" /> {tr("Add")}
            </a>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-ink min-w-0">
              {m.format === "online" ? (
                <Video className="w-4 h-4 text-gold-ink shrink-0" />
              ) : (
                <MapPin className="w-4 h-4 text-gold-ink shrink-0" />
              )}
              <span className="truncate">
                {m.restricted
                  ? tr("Shared once you're in")
                  : m.format === "online"
                    ? tr("Online")
                    : m.location ?? tr("To be announced")}
              </span>
            </span>
            {/* The link and the address ARE the door on a private meetup —
                withholding them is what makes "request to join" mean
                anything now that private meetups are listed. */}
            {m.restricted ? null : m.format === "online" && m.online_url ? (
              <a
                href={m.online_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-navy hover:text-gold-ink"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {tr("Open link")}
              </a>
            ) : mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-navy hover:text-gold-ink"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {tr("Open in maps")}
              </a>
            ) : null}
          </div>
        </div>

        {m.description && (
          <p className="mt-4 text-sm leading-relaxed text-ink whitespace-pre-wrap line-clamp-[8]">
            {m.description}
          </p>
        )}

        <div className="mt-5 flex items-center gap-2">
          {m.goers.length > 0 && (
            <span className="flex -space-x-1.5">
              {m.goers.slice(0, 6).map((p) => (
                <span
                  key={p.id}
                  className="rounded-full ring-2 ring-white inline-flex"
                >
                  <MiniFace p={p} />
                </span>
              ))}
            </span>
          )}
          <span className="text-xs text-ink-muted">
            {m.count === 0
              ? tr("Be the first to join")
              : `${m.count}${m.capacity != null ? `/${m.capacity}` : ""} ${tr("going")}`}
          </span>
          <Link
            href={`/meetups/${m.slug}`}
            className="ml-auto text-xs text-ink-muted hover:text-navy"
          >
            {tr("Full details")}
          </Link>
        </div>

        {error && (
          <p className="mt-4 text-sm text-danger-ink bg-danger-surface border border-danger-line rounded-xl px-4 py-3">
            {error}
          </p>
        )}

        {/* The door — one component, shared with /meetups/[slug], so the
            two surfaces cannot drift apart on what private means. */}
        <div className="mt-5">
          <MeetupJoinControls
            meetupId={m.id}
            canRsvp={canRsvp}
            canHost={canHost}
            closed={cancelled || isPast}
            state={{
              isHost: m.isHost,
              mine: m.mine,
              invite: m.invite,
              count: m.count,
              capacity: m.capacity,
              visibility: m.visibility,
              hostMatchId: m.hostMatchId,
              hostSlug: m.hostSlug,
              requesters: m.requesters,
            }}
            ctaFullWidth
            onChange={(next) => onRsvp(m.id, next)}
          />
        </div>

        <div className="mt-4 text-center">
          {reported ? (
            <span className="text-xs text-ink-muted">
              {tr("Thanks — the team will take a look.")}
            </span>
          ) : reporting ? (
            <div className="text-left">
              <textarea
                value={reportText}
                onChange={(e) => setReportText(e.target.value)}
                rows={2}
                maxLength={1000}
                placeholder={tr("What's wrong with this meetup?")}
                className="w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none rounded-xl"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReporting(false)}
                  className="px-3 py-1.5 text-xs text-ink-muted hover:text-navy"
                >
                  {tr("Cancel")}
                </button>
                {/* size="xs" is px-3 py-1.5 text-xs; only the horizontal pad
                    needed holding. It also gains the disabled treatment it
                    never had — `disabled={busy}` was styled as if enabled. */}
                <Button
                  size="xs"
                  disabled={busy}
                  onClick={sendReport}
                  className="px-4"
                >
                  {tr("Send report")}
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setReporting(true)}
              className="inline-flex items-center gap-1 text-xs text-ink-muted hover:text-danger-ink"
            >
              <Flag className="w-3 h-3" /> {tr("Report meetup")}
            </button>
          )}
        </div>
      </div>
    </Dialog>
  );
}
