"use client";

// The meetups page's interaction layer, matched to the reference product's:
// nothing here navigates. A card opens a DIALOG with Join inside it, Create
// opens the wizard modal, List/Map toggles instantly, and the header's
// founder pile opens the roster. The /meetups/[slug] page still exists for
// deep links and private (link-only) meetups — this component is how the
// LISTED calendar behaves.
//
// The server page fetches everything and hands it over serialised; every
// mutation goes back through the same server actions the detail page uses
// (rsvpAction / reportMeetupAction), with optimistic going/count updates.

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  CalendarPlus,
  Check,
  ExternalLink,
  Flag,
  List as ListIcon,
  Map as MapIcon,
  MapPin,
  Plus,
  Video,
  X,
} from "lucide-react";
import { useT } from "@/lib/i18n-client";
import {
  MEETUP_CATEGORIES,
  meetupCalendarUrl,
  meetupCoverUrl,
  meetupWhenParts,
  type MeetupCategory,
  type MeetupFormat,
} from "@/lib/meetups";
import { colorFor, getInitials } from "@/components/Avatar";
import { MeetupMap, type MeetupPin } from "@/components/MeetupMap";
import { EmptyState } from "@/components/ui";
import { rsvpAction, reportMeetupAction } from "./actions";
import { HostMeetupWizard } from "./HostMeetupWizard";

export type MiniProfile = {
  id: string;
  full_name: string | null;
  photo_url: string | null;
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
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  count: number;
  goers: MiniProfile[];
  host: MiniProfile | null;
  going: boolean;
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

// Overlay shell per the surface rules: overlays are the one border+shadow
// surface, rounded-xl.
function Modal({
  onClose,
  children,
  wide,
}: {
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-navy/40 p-4 overflow-y-auto"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className={`relative my-8 w-full ${wide ? "max-w-xl" : "max-w-lg"} rounded-xl border border-line bg-white shadow-lg`}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full bg-white/90 text-ink hover:text-navy"
        >
          <X className="w-4 h-4" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function MeetupsClient({
  thisMonth,
  later,
  past,
  nearby,
  investor,
  initialCreate,
}: {
  thisMonth: MeetupItemData[];
  later: MeetupItemData[];
  past: MeetupItemData[];
  nearby: MiniProfile[];
  investor: boolean;
  initialCreate: boolean;
}) {
  const tr = useT();
  const [view, setView] = useState<"list" | "map">("list");
  const [selected, setSelected] = useState<MeetupItemData | null>(null);
  const [createOpen, setCreateOpen] = useState(initialCreate);
  const [rosterOpen, setRosterOpen] = useState(false);
  // id → optimistic {going, count} overrides after an RSVP round-trip.
  const [over, setOver] = useState<Record<string, { going: boolean; count: number }>>(
    {},
  );

  const upcoming = [...thisMonth, ...later];
  const withOver = (m: MeetupItemData): MeetupItemData =>
    over[m.id] ? { ...m, ...over[m.id] } : m;

  const pins: MeetupPin[] = upcoming
    .filter((m) => m.lat != null && m.lng != null && m.status !== "cancelled")
    .map((m) => ({
      slug: m.slug,
      title: m.title,
      lat: m.lat as number,
      lng: m.lng as number,
      emoji: (MEETUP_CATEGORIES[m.category] ?? MEETUP_CATEGORIES.other).emoji,
    }));

  const toggleCls = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-1.5 text-sm tracking-wide transition-colors border rounded-full ${
      active
        ? "bg-navy border-navy text-white"
        : "bg-white border-line text-ink hover:border-navy"
    }`;

  const card = (m: MeetupItemData, opts?: { past?: boolean; strip?: boolean }) => (
    <MeetupCard
      key={m.id}
      m={withOver(m)}
      onOpen={() => setSelected(m)}
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
          <button
            type="button"
            onClick={() => setView("list")}
            className={toggleCls(view === "list")}
          >
            <ListIcon className="w-3.5 h-3.5" /> {tr("List")}
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={toggleCls(view === "map")}
          >
            <MapIcon className="w-3.5 h-3.5" /> {tr("Map")}
          </button>
          {!investor && (
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy px-4 py-1.5 text-sm text-white hover:bg-navy-dark transition-colors"
            >
              <Plus className="w-4 h-4" />
              {tr("Create a meetup")}
            </button>
          )}
        </div>
      </div>

      {view === "map" ? (
        <div>
          <MeetupMap pins={pins} />
          {pins.length === 0 && (
            <p className="mt-4 text-sm text-ink-muted">
              {tr("Meetups with a map pin show up here.")}
            </p>
          )}
        </div>
      ) : upcoming.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title={tr("No meetups on the calendar")}
          description={tr(
            "Want to meet founders in person? Host the first one — every member will see it.",
          )}
          action={
            investor ? undefined : (
              <button
                type="button"
                onClick={() => setCreateOpen(true)}
                className="inline-flex items-center justify-center rounded-full bg-navy px-6 py-3 text-sm text-white hover:bg-navy-dark transition-colors"
              >
                {tr("Host the first meetup")}
              </button>
            )
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
                {!investor && (
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
          investor={investor}
          onClose={() => setSelected(null)}
          onRsvp={(id, going, count) =>
            setOver((o) => ({ ...o, [id]: { going, count } }))
          }
        />
      )}

      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} wide>
          <div className="p-6 sm:p-8">
            <h2 className="text-xl mb-5">{tr("Create a meetup")}</h2>
            <HostMeetupWizard />
          </div>
        </Modal>
      )}

      {rosterOpen && (
        <Modal onClose={() => setRosterOpen(false)}>
          <div className="p-6">
            <h2 className="text-xl mb-5">
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
        </Modal>
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
  const where =
    m.format === "online" ? tr("Online") : m.location ?? tr("In person");
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
      <div className="bg-white rounded-3xl shadow-xs hover:shadow-sm transition-shadow h-full flex flex-col overflow-hidden">
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
          {cancelled && (
            <span className="absolute top-3 right-3 text-xs uppercase tracking-[0.15em] text-danger-ink bg-danger-surface border border-danger-line rounded-full px-2 py-0.5">
              {tr("Cancelled")}
            </span>
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
            {m.going && !cancelled && (
              <span className="shrink-0 inline-flex items-center gap-1 text-xs text-navy">
                <Check className="w-3 h-3" /> {tr("You're going")}
              </span>
            )}
            <span className="ml-auto shrink-0 w-8 h-8 rounded-full border border-line grid place-items-center text-ink group-hover:bg-navy group-hover:border-navy group-hover:text-white transition-colors">
              <ArrowRight className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

function MeetupDialog({
  m,
  investor,
  onClose,
  onRsvp,
}: {
  m: MeetupItemData;
  investor: boolean;
  onClose: () => void;
  onRsvp: (id: string, going: boolean, count: number) => void;
}) {
  const tr = useT();
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
  const full = m.capacity != null && !m.going && m.count >= m.capacity;
  // "Open" on the address, the way their dialog does it: the pin when the
  // host placed one, else a text search — never a geocode guess.
  const mapsUrl =
    m.lat != null && m.lng != null
      ? `https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`
      : m.location
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.location)}`
        : null;

  async function toggleRsvp() {
    setBusy(true);
    setError(null);
    const res = await rsvpAction(m.id, !m.going);
    setBusy(false);
    if (res.error) {
      setError(tr(res.error));
      return;
    }
    onRsvp(m.id, res.going ?? !m.going, res.count ?? m.count);
  }

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
    <Modal onClose={onClose}>
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
          {cancelled && (
            <span className="inline-flex items-center rounded-full bg-danger-surface border border-danger-line px-2.5 py-0.5 text-danger-ink">
              {tr("Cancelled")}
            </span>
          )}
        </div>

        <h2 className="text-xl mb-4">{m.title}</h2>

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
                {m.format === "online"
                  ? tr("Online")
                  : m.location ?? tr("To be announced")}
              </span>
            </span>
            {m.format === "online" && m.online_url ? (
              <a
                href={m.online_url}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-navy hover:text-gold-ink"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {tr("Open")}
              </a>
            ) : mapsUrl ? (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1 text-xs text-navy hover:text-gold-ink"
              >
                <ExternalLink className="w-3.5 h-3.5" /> {tr("Open")}
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

        {!investor && !cancelled && !isPast && (
          <button
            type="button"
            disabled={busy || (full && !m.going)}
            onClick={toggleRsvp}
            className={`mt-5 w-full rounded-full py-3 text-sm tracking-wide transition-colors ${
              m.going
                ? "border border-line text-ink hover:border-navy"
                : full
                  ? "bg-line text-ink-muted cursor-not-allowed"
                  : "bg-navy text-white hover:bg-navy-dark"
            }`}
          >
            {m.going
              ? tr("You're going — tap to cancel")
              : full
                ? tr("Fully booked")
                : tr("Join Meetup")}
          </button>
        )}

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
                <button
                  type="button"
                  disabled={busy}
                  onClick={sendReport}
                  className="rounded-full bg-navy px-4 py-1.5 text-xs text-white hover:bg-navy-dark"
                >
                  {tr("Send report")}
                </button>
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
    </Modal>
  );
}
