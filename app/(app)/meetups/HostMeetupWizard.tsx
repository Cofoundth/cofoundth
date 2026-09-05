"use client";

// Host a meetup — a four-step wizard, matching the reference product's create
// flow: pick a FORMAT, pick a TOPIC, say WHEN AND WHERE, then fill in the
// DETAILS. One component serves both entry points (the modal on /meetups and
// the standalone /meetups/new page, via `inModal`) so the flow is identical
// wherever it starts.
//
// ── Why one <form> around all four steps ──────────────────────────────────
// A file input cannot be re-created from state: unmounting the cover field on
// step 3 and remounting it on step 4 would silently drop the host's chosen
// image. So the form stays mounted for the whole wizard and every value rides
// a hidden input; the visible controls are React-controlled and NAMELESS,
// which is also what lets a value survive Back/Next without a round-trip.
//
// The location sheet is INSIDE that form for the same reason. It reads as a
// full-screen takeover, but it may only swap the form's CONTENTS — an early
// `return` of a different root element would unmount the <form> and take the
// cover file with it, which is the exact bug the single-form design exists to
// prevent. Only the cover input is kept mounted across that swap (`hidden`);
// everything else is React state and rebuilds for free.
//
// The one exception is step 4's own fields (title / description / capacity),
// which are both controlled AND named — they only exist on the submitting
// step, so there is nothing to preserve them past.
//
// `onSubmit` blocks submission on any step but the last. That is not belt and
// braces: while the location sheet is open the form holds exactly one text
// field (the place search), which is enough for a browser to implicitly submit
// on Enter even with no submit button rendered.

import { useActionState, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronRight, MapPin, X } from "lucide-react";
import { useLocale, useT } from "@/lib/i18n-client";
import {
  bangkokToday,
  MEETUP_CATEGORIES,
  MEETUP_CATEGORY_SECTIONS,
  MEETUP_TOPICS,
  nextBangkokDay,
  type MeetupCategory,
  type MeetupTopic,
} from "@/lib/meetups";
import { MapPicker } from "@/components/MeetupMap";
import { LocationSearch } from "./new/LocationSearch";
import { hostMeetupAction, type HostMeetupState } from "./actions";
import { Button, Eyebrow, Input, Textarea } from "@/components/ui";

const LABEL = "block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2";
/** Selectable surface — tiles, topic rows, the two audience cards. */
const PICK = "rounded-xl border text-left transition-colors";
const PICK_ON = "border-navy bg-cream";
const PICK_OFF = "border-line bg-white hover:border-navy";

/** Mirrors `urlOk` in actions.ts. Checked here so a bad link fails ON the step
 *  that holds the field, not four steps later in the server's error panel —
 *  the field is unmounted by then, so the browser's own `type="url"` check
 *  never gets to run either. */
const URL_OK = /^https?:\/\/.+\..+/;

/** Has this Bangkok-local "YYYY-MM-DDTHH:mm" already gone by? Called from the
 *  Next handler, never during render: render stays pure, and the answer is
 *  computed at the moment it actually gates something. The server checks this
 *  too — but it would say so on step 4, two steps from the field. */
function startsInPast(v: string): boolean {
  const t = new Date(`${v}:00+07:00`).getTime();
  return Number.isFinite(t) && t < Date.now();
}

type Step = 1 | 2 | 3 | 4;

export function HostMeetupWizard({
  inModal,
  onClose,
}: {
  /** Rendered inside the /meetups create dialog: own the shell height, and
   *  show the Close / Exit affordances the dialog needs. */
  inModal?: boolean;
  /** Present only when there is something to close — the dialog. */
  onClose?: () => void;
} = {}) {
  const tr = useT();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<HostMeetupState, FormData>(
    hostMeetupAction,
    undefined,
  );

  const [step, setStep] = useState<Step>(1);
  const [locView, setLocView] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  /** Set when Next is pressed on a start time that has already passed. */
  const [pastStart, setPastStart] = useState(false);

  const [category, setCategory] = useState<MeetupCategory | null>(null);
  const [topic, setTopic] = useState<MeetupTopic | null>(null);
  const [format, setFormat] = useState<"in_person" | "online">("in_person");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [location, setLocation] = useState("");
  const [onlineUrl, setOnlineUrl] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState("");

  // The pin the sheet is editing. Kept apart from `pin` so backing out of the
  // sheet leaves an already-saved location alone.
  const [draftPin, setDraftPin] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [draftLocation, setDraftLocation] = useState("");
  // The reverse-geocode still in flight, if any. Saving has to WAIT on it:
  // "Save location" enables the instant a pin drops, so a host who taps the
  // map and saves immediately would otherwise store a nameless location and
  // throw away the name the lookup was about to return.
  const naming = useRef<Promise<string | null> | null>(null);

  // Clicking the map when the host has not named the spot: name it for them.
  async function lookUpPlaceName(
    lat: number,
    lng: number,
  ): Promise<string | null> {
    try {
      const res = await fetch(
        `/api/geocode?lat=${lat}&lng=${lng}&lang=${locale}`,
      );
      if (!res.ok) return null;
      const body: { results?: { label: string; detail: string }[] } =
        await res.json();
      const first = body.results?.[0];
      if (!first) return null;
      return first.detail ? `${first.label}, ${first.detail}` : first.label;
    } catch {
      // The pin is still valid without a name — say nothing.
      return null;
    }
  }

  function nameThePin(lat: number, lng: number) {
    const lookup = lookUpPlaceName(lat, lng).then((name) => {
      // The functional setState is the guard — if they started typing while
      // the lookup was in flight, their words win.
      if (name) setDraftLocation((current) => (current.trim() ? current : name));
      return name;
    });
    naming.current = lookup;
  }

  const startsAt = date && startTime ? `${date}T${startTime}` : "";
  // The end time is a clock time, not a date: an end EARLIER in the day than
  // the start means the meetup runs past midnight, which is the normal shape
  // of a dinner or a drinks meetup. Rolling to the next day here is what keeps
  // that expressible — the wizard deliberately has no second date field.
  const endsNextDay = Boolean(
    date && startTime && endTime && endTime < startTime,
  );
  const endsAt =
    date && endTime
      ? `${endsNextDay ? nextBangkokDay(date) : date}T${endTime}`
      : "";

  const badUrl = onlineUrl.trim() !== "" && !URL_OK.test(onlineUrl.trim());
  // A pin is what puts the meetup on the map, but typed text alone has always
  // been enough to host one — "my place, Ladprao soi 5" is a location.
  const placeReady =
    format === "online"
      ? URL_OK.test(onlineUrl.trim())
      : pin !== null || location.trim() !== "";
  const placeSet = pin !== null || location.trim() !== "";

  const dirty =
    category !== null ||
    topic !== null ||
    date !== "" ||
    startTime !== "" ||
    location !== "" ||
    onlineUrl !== "" ||
    title !== "" ||
    description !== "";

  function requestExit() {
    if (dirty) setConfirmExit(true);
    else onClose?.();
  }

  function openLocationSheet() {
    setDraftPin(pin);
    setDraftLocation(location);
    naming.current = null;
    setLocView(true);
  }

  async function saveLocation() {
    if (!draftPin && !draftLocation.trim()) return;
    let text = draftLocation;
    if (!text.trim() && naming.current) {
      const resolved = await naming.current;
      if (resolved) text = resolved;
    }
    setPin(draftPin);
    setLocation(text);
    naming.current = null;
    setLocView(false);
  }

  // ── Shell ────────────────────────────────────────────────────────────────
  // The dialog caps its own height and scrolls the body; the page lets the
  // page scroll instead.
  const shell = inModal ? "flex max-h-[80vh] flex-col" : "flex flex-col";
  const band = "px-6 sm:px-8";

  // ── Header copy, per step ────────────────────────────────────────────────
  const HEAD: Record<Step, { title: string; sub: string }> = {
    1: {
      title: tr("Create a meetup"),
      sub: tr("Pick a format to start meeting other founders."),
    },
    2: {
      title: tr("What do you want to talk about?"),
      sub: tr("Choose the focus of your meetup."),
    },
    3: {
      title: tr("When and where?"),
      sub: tr("Pick a date, start time, and the exact spot you'll meet."),
    },
    4: {
      title: tr("Details"),
      sub: tr("Give founders a reason to show up."),
    },
  };

  return (
    <form
      action={formAction}
      onSubmit={(e) => {
        // Only the last step submits — see the header note.
        if (step !== 4 || locView) e.preventDefault();
      }}
      className={shell}
    >
      {/* Every wizard value rides a hidden input, first in tree order. */}
      <input type="hidden" name="category" value={category ?? ""} />
      <input type="hidden" name="topic" value={topic ?? ""} />
      <input type="hidden" name="format" value={format} />
      <input
        type="hidden"
        name="location"
        value={format === "in_person" ? location : ""}
      />
      <input
        type="hidden"
        name="online_url"
        value={format === "online" ? onlineUrl : ""}
      />
      <input
        type="hidden"
        name="lat"
        value={format === "in_person" && pin ? String(pin.lat) : ""}
      />
      <input
        type="hidden"
        name="lng"
        value={format === "in_person" && pin ? String(pin.lng) : ""}
      />
      <input type="hidden" name="starts_at" value={startsAt} />
      <input type="hidden" name="ends_at" value={endsAt} />
      <input type="hidden" name="visibility" value={visibility} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      {locView ? (
        // The location sheet takes the whole shell, the way their full-height
        // "Set location" screen does — but only the CONTENTS swap.
        <div className={`${band} flex items-center gap-3 pt-6 pb-5`}>
          <button
            type="button"
            onClick={() => setLocView(false)}
            aria-label={tr("Back")}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink hover:border-navy"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h2 className="text-lg font-bold tracking-normal">
            {tr("Set location")}
          </h2>
        </div>
      ) : (
        <div className={`${band} pt-6`}>
          {step === 1 ? (
            onClose && (
              <div className="mb-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg font-bold tracking-normal">
                    {HEAD[1].title}
                  </h2>
                  <p className="mt-2 text-sm text-ink-muted">{HEAD[1].sub}</p>
                </div>
                <button
                  type="button"
                  onClick={requestExit}
                  aria-label={tr("Close")}
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink hover:text-navy"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )
          ) : (
            <div className="mb-5 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep((s) => (s - 1) as Step)}
                aria-label={tr("Back")}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-ink hover:border-navy"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="flex flex-1 items-center gap-1.5">
                {[2, 3, 4].map((n) => (
                  <span
                    key={n}
                    className={`h-1 flex-1 rounded-full ${
                      step >= n ? "bg-navy" : "bg-line"
                    }`}
                  />
                ))}
              </div>
              {onClose && (
                <button
                  type="button"
                  onClick={requestExit}
                  className="shrink-0 text-sm text-ink-muted hover:text-navy"
                >
                  {tr("Exit")}
                </button>
              )}
            </div>
          )}

          {/* Step 1 in the dialog already showed its title+subline above; on
              the page the h1 is the page's, so only the subline belongs here. */}
          {(step > 1 || !onClose) && (
            <div className="mb-5">
              {step > 1 && (
                <h2 className="text-lg font-bold tracking-normal">
                  {HEAD[step].title}
                </h2>
              )}
              <p className={`text-sm text-ink-muted ${step > 1 ? "mt-2" : ""}`}>
                {HEAD[step].sub}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className={`${band} min-h-0 flex-1 overflow-y-auto pb-6`}>
        {locView ? (
          <>
            <LocationSearch
              value={draftLocation}
              onChange={setDraftLocation}
              onPick={setDraftPin}
              label={tr("Search a place or address")}
              placeholder={tr("Cafe, coworking space, or neighbourhood")}
            />
            <div className="mt-5">
              <MapPicker
                pin={draftPin}
                onPick={(lat, lng) => {
                  if (lat === null || lng === null) {
                    setDraftPin(null);
                    return;
                  }
                  setDraftPin({ lat, lng });
                  if (!draftLocation.trim()) nameThePin(lat, lng);
                }}
              />
            </div>
            <p className="mt-3 text-xs text-ink-muted">
              {tr(
                "Search a place, tap the map, or just type where you'll meet.",
              )}
            </p>
          </>
        ) : (
          <>
            {/* ── 1. Format ───────────────────────────────────────────── */}
            {step === 1 && (
              <div className="space-y-6">
                {MEETUP_CATEGORY_SECTIONS.map((section) => (
                  <div key={section.label}>
                    <Eyebrow className="mb-3">{tr(section.label)}</Eyebrow>
                    <div className="grid grid-cols-2 gap-3">
                      {section.keys.map((key) => {
                        const c = MEETUP_CATEGORIES[key];
                        const on = category === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setCategory(key)}
                            aria-pressed={on}
                            className={`${PICK} ${
                              on ? PICK_ON : PICK_OFF
                            } flex flex-col gap-3 p-4`}
                          >
                            <span
                              aria-hidden="true"
                              className="grid h-10 w-10 place-items-center rounded-lg bg-gold-soft"
                            >
                              {c.emoji}
                            </span>
                            <span className="text-sm text-ink">
                              {tr(c.label)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── 2. Topic ────────────────────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-2">
                {(
                  Object.entries(MEETUP_TOPICS) as [
                    MeetupTopic,
                    { label: string; blurb: string },
                  ][]
                ).map(([key, t]) => {
                  const on = topic === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTopic(key)}
                      aria-pressed={on}
                      className={`${PICK} ${
                        on ? PICK_ON : PICK_OFF
                      } flex w-full items-center gap-3 px-4 py-3`}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-ink">
                          {tr(t.label)}
                        </span>
                        <span className="block text-xs text-ink-muted">
                          {tr(t.blurb)}
                        </span>
                      </span>
                      {on && <Check className="h-4 w-4 shrink-0 text-navy" />}
                    </button>
                  );
                })}
              </div>
            )}

            {/* ── 3. When and where ───────────────────────────────────── */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  {/* Stacked below `sm`: at 390px each column is ~145px, which
                      is narrower than a native date picker wants and narrow
                      enough to wrap one label and not the other. */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      id="meetup-date"
                      label={tr("Date")}
                      type="date"
                      fieldSize="sm"
                      min={bangkokToday()}
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setPastStart(false);
                      }}
                    />
                    <Input
                      id="meetup-start"
                      label={tr("Start")}
                      type="time"
                      fieldSize="sm"
                      value={startTime}
                      onChange={(e) => {
                        setStartTime(e.target.value);
                        setPastStart(false);
                      }}
                    />
                  </div>
                  {pastStart && (
                    <p className="mt-2 text-xs text-danger-ink">
                      {tr("Pick a time in the future.")}
                    </p>
                  )}
                </div>

                <div>
                  <span className={LABEL}>{tr("Where exactly?")}</span>
                  <div className="mb-3 flex gap-1.5">
                    {(
                      [
                        ["in_person", tr("In person")],
                        ["online", tr("Online")],
                      ] as const
                    ).map(([key, label]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormat(key)}
                        aria-pressed={format === key}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          format === key
                            ? "border-navy bg-navy text-white"
                            : "border-line bg-white text-ink hover:border-navy"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {format === "in_person" ? (
                    placeSet ? (
                      <div className="rounded-xl border border-line bg-white px-4 py-3">
                        <div className="flex items-start gap-3">
                          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-muted" />
                          <span className="min-w-0 flex-1 text-sm text-ink">
                            {location.trim() || tr("Pinned on the map")}
                          </span>
                          <button
                            type="button"
                            onClick={openLocationSheet}
                            className="shrink-0 text-sm text-ink-muted hover:text-navy"
                          >
                            {tr("Change")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={openLocationSheet}
                        className={`${PICK} ${PICK_OFF} flex w-full items-center gap-3 px-4 py-3`}
                      >
                        <MapPin className="h-4 w-4 shrink-0 text-ink-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-ink">
                            {tr("Add location")}
                          </span>
                          <span className="block text-xs text-ink-muted">
                            {tr("Search, drop a pin, or type it in")}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-muted" />
                      </button>
                    )
                  ) : (
                    <Input
                      id="meetup-online-url"
                      label={tr("Meeting link")}
                      type="url"
                      fieldSize="sm"
                      placeholder="https://meet.google.com/…"
                      value={onlineUrl}
                      error={
                        badUrl
                          ? tr("Enter a valid meeting link (https://…).")
                          : undefined
                      }
                      onChange={(e) => setOnlineUrl(e.target.value)}
                    />
                  )}
                </div>

                <div>
                  <span className={LABEL}>{tr("Who can join?")}</span>
                  <div className="space-y-2">
                    {/* The blurbs describe what `visibility` ACTUALLY does here
                        — listed vs link-only. The reference product's private
                        mode is request-and-approve, which we do not have;
                        promising it in the copy would be a lie the product
                        can't keep. */}
                    {(
                      [
                        [
                          "public",
                          tr("Open to all"),
                          tr("Any founder on Cofoundee can claim a spot."),
                        ],
                        [
                          "private",
                          tr("Private"),
                          tr("Only founders you send the link to can see it."),
                        ],
                      ] as const
                    ).map(([key, label, blurb]) => {
                      const on = visibility === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setVisibility(key)}
                          aria-pressed={on}
                          className={`${PICK} ${
                            on ? PICK_ON : PICK_OFF
                          } flex w-full items-center gap-3 px-4 py-3`}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-medium text-ink">
                              {label}
                            </span>
                            <span className="block text-xs text-ink-muted">
                              {blurb}
                            </span>
                          </span>
                          {on && (
                            <Check className="h-4 w-4 shrink-0 text-navy" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ── 4. Details ──────────────────────────────────────────── */}
            {step === 4 && (
              <div className="space-y-6">
                <Input
                  id="title"
                  name="title"
                  label={tr("Title")}
                  fieldSize="sm"
                  required
                  minLength={2}
                  maxLength={120}
                  placeholder={tr("Coffee and co-founder talk in Ladprao")}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Textarea
                  id="description"
                  name="description"
                  label={tr("Details (optional)")}
                  fieldSize="sm"
                  rows={4}
                  maxLength={5000}
                  placeholder={tr(
                    "What's the plan? Who should come? Anything to bring?",
                  )}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    id="capacity"
                    name="capacity"
                    label={tr("Capacity (optional)")}
                    type="number"
                    fieldSize="sm"
                    min={2}
                    max={500}
                    placeholder={tr("Leave empty for no limit")}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                  />
                  <div>
                    <Input
                      id="meetup-end"
                      label={tr("Ends (optional)")}
                      type="time"
                      fieldSize="sm"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
                    {/* Say it out loud rather than silently booking a meetup
                        on a day the host never picked. */}
                    {endsNextDay && (
                      <p className="mt-1.5 text-xs text-ink-muted">
                        {tr("Ends the next day")}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* The cover input NEVER unmounts: a file input cannot be rebuilt from
            state, so hiding it is the only way Back/Next — and the location
            sheet — keeps the choice. */}
        <div className={!locView && step === 4 ? "mt-6" : "hidden"}>
          <label htmlFor="cover" className={LABEL}>
            {tr("Cover photo (optional)")}
          </label>
          <input
            id="cover"
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-ink-muted file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:text-white hover:file:bg-navy-dark file:cursor-pointer"
          />
          <p className="mt-2 text-xs text-ink-muted">
            {tr("Skip it and we'll use the category artwork.")}
          </p>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <div className={`${band} border-t border-line py-5`}>
        {locView ? (
          <Button
            type="button"
            fullWidth
            disabled={!draftPin && !draftLocation.trim()}
            onClick={saveLocation}
          >
            {tr("Save location")}
          </Button>
        ) : (
          <>
            {state?.error && (
              <p className="mb-3 rounded-xl border border-danger-line bg-danger-surface px-4 py-3 text-sm text-danger-ink">
                {tr(state.error)}
              </p>
            )}

            {confirmExit ? (
              <div className="rounded-xl border border-line bg-cream p-4">
                <p className="text-sm font-medium text-ink">
                  {tr("Discard this meetup?")}
                </p>
                <p className="mt-2 text-xs text-ink-muted">
                  {tr("You'll lose everything you've entered so far.")}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    onClick={() => onClose?.()}
                  >
                    {tr("Discard")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => setConfirmExit(false)}
                  >
                    {tr("Keep editing")}
                  </Button>
                </div>
              </div>
            ) : step === 4 ? (
              <Button type="submit" fullWidth disabled={pending}>
                {pending ? tr("Creating…") : tr("Create meetup")}
              </Button>
            ) : (
              <Button
                type="button"
                fullWidth
                disabled={
                  (step === 1 && category === null) ||
                  (step === 2 && topic === null) ||
                  (step === 3 && !(date && startTime && placeReady))
                }
                onClick={() => {
                  if (step === 3 && startsAt && startsInPast(startsAt)) {
                    setPastStart(true);
                    return;
                  }
                  setStep((s) => (s + 1) as Step);
                }}
              >
                {tr("Next")}
              </Button>
            )}
          </>
        )}
      </div>
    </form>
  );
}
