"use client";

// The founder-facing "host a meetup" form. Deliberately smaller than the
// admin's MeetupForm: no status control (hosted meetups publish immediately),
// no danger zone, and category leads because it is the first thing the card
// shows. Field patterns follow the admin form so the two stay recognisably
// the same product.

import { useActionState, useState } from "react";
import { useLocale, useT } from "@/lib/i18n-client";
import { MEETUP_CATEGORIES, type MeetupCategory } from "@/lib/meetups";
import { MapPicker } from "@/components/MeetupMap";
import { LocationSearch } from "./LocationSearch";
import { hostMeetupAction, type HostMeetupState } from "../actions";
import { Button } from "@/components/ui";

const FIELD =
  "w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none rounded-xl";
const LABEL = "block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2";

export function HostMeetupForm({
  fixedCategory,
}: {
  /** Set by the create wizard: step 1 picked the category, so the picker is
   *  not rendered again — the value rides the hidden input. */
  fixedCategory?: MeetupCategory;
} = {}) {
  const tr = useT();
  const locale = useLocale();
  const [state, formAction, pending] = useActionState<HostMeetupState, FormData>(
    hostMeetupAction,
    undefined,
  );
  const [category, setCategory] = useState<MeetupCategory>(
    fixedCategory ?? "coffee",
  );
  const [format, setFormat] = useState<"in_person" | "online">("in_person");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [location, setLocation] = useState("");

  // Clicking the map when the host has not written a location yet: name the
  // spot for them. The functional setState is the guard — if they started
  // typing while the lookup was in flight, their words win.
  async function nameThePin(lat: number, lng: number) {
    try {
      const res = await fetch(
        `/api/geocode?lat=${lat}&lng=${lng}&lang=${locale}`,
      );
      if (!res.ok) return;
      const body: {
        results?: { label: string; detail: string }[];
      } = await res.json();
      const first = body.results?.[0];
      if (!first) return;
      setLocation((current) =>
        current.trim()
          ? current
          : first.detail
            ? `${first.label}, ${first.detail}`
            : first.label,
      );
    } catch {
      // The pin is still valid without a name — say nothing.
    }
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className={fixedCategory ? "hidden" : undefined}>
        <span className={LABEL}>{tr("Category")}</span>
        <div className="flex flex-wrap gap-1.5">
          {(
            Object.entries(MEETUP_CATEGORIES) as [
              MeetupCategory,
              { emoji: string; label: string },
            ][]
          ).map(([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              aria-pressed={category === key}
              className={`px-3 py-1.5 text-sm tracking-wide transition-colors border ${
                category === key
                  ? "bg-navy border-navy text-white"
                  : "bg-white border-line text-ink hover:border-navy"
              }`}
            >
              {c.emoji} {tr(c.label)}
            </button>
          ))}
        </div>
        <input type="hidden" name="category" value={category} />
      </div>

      <div>
        <label htmlFor="title" className={LABEL}>
          {tr("Title")}
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={2}
          maxLength={120}
          placeholder={tr("Coffee and co-founder talk in Ladprao")}
          className={FIELD}
        />
      </div>

      <div>
        <span className={LABEL}>{tr("Format")}</span>
        <div className="flex gap-1.5">
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
              className={`px-3 py-1.5 text-sm tracking-wide transition-colors border ${
                format === key
                  ? "bg-navy border-navy text-white"
                  : "bg-white border-line text-ink hover:border-navy"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="format" value={format} />
      </div>

      {format === "in_person" ? (
        <div>
          <LocationSearch
            value={location}
            onChange={setLocation}
            onPick={setPin}
            label={tr("Where")}
            placeholder={tr("Cafe, coworking space, or neighbourhood")}
          />
          <p className="text-xs text-ink-muted mt-3 mb-2">
            {tr("Pin it on the map so it shows in map view (optional)")}
          </p>
          <MapPicker
            pin={pin}
            onPick={(lat, lng) => {
              if (lat === null || lng === null) {
                setPin(null);
                return;
              }
              setPin({ lat, lng });
              if (!location.trim()) void nameThePin(lat, lng);
            }}
          />
          <input type="hidden" name="lat" value={pin ? String(pin.lat) : ""} />
          <input type="hidden" name="lng" value={pin ? String(pin.lng) : ""} />
        </div>
      ) : (
        <div>
          <label htmlFor="online_url" className={LABEL}>
            {tr("Meeting link")}
          </label>
          <input
            id="online_url"
            name="online_url"
            type="url"
            placeholder="https://meet.google.com/…"
            className={FIELD}
          />
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        <div>
          <label htmlFor="starts_at" className={LABEL}>
            {tr("Starts")}
          </label>
          <input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            required
            className={FIELD}
          />
        </div>
        <div>
          <label htmlFor="ends_at" className={LABEL}>
            {tr("Ends (optional)")}
          </label>
          <input
            id="ends_at"
            name="ends_at"
            type="datetime-local"
            className={FIELD}
          />
        </div>
      </div>

      <div>
        <label htmlFor="capacity" className={LABEL}>
          {tr("Capacity (optional)")}
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          min={2}
          max={500}
          placeholder={tr("Leave empty for no limit")}
          className={FIELD}
        />
      </div>

      <div>
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
        <p className="text-xs text-ink-muted mt-2">
          {tr("Skip it and we'll use the category artwork.")}
        </p>
      </div>

      <div>
        <span className={LABEL}>{tr("Who can see it")}</span>
        <div className="flex gap-1.5">
          {(
            [
              ["public", tr("Everyone on Cofoundee")],
              ["private", tr("Only people with the link")],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setVisibility(key)}
              aria-pressed={visibility === key}
              className={`px-3 py-1.5 text-sm tracking-wide transition-colors border ${
                visibility === key
                  ? "bg-navy border-navy text-white"
                  : "bg-white border-line text-ink hover:border-navy"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <input type="hidden" name="visibility" value={visibility} />
      </div>

      <div>
        <label htmlFor="description" className={LABEL}>
          {tr("Details (optional)")}
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={5000}
          placeholder={tr(
            "What's the plan? Who should come? Anything to bring?",
          )}
          className={FIELD}
        />
      </div>

      {state?.error && (
        <p className="text-sm text-danger-ink bg-danger-surface border border-danger-line rounded-xl px-4 py-3">
          {tr(state.error)}
        </p>
      )}

      <Button type="submit" disabled={pending}>
        {pending ? tr("Creating…") : tr("Create meetup")}
      </Button>
    </form>
  );
}
