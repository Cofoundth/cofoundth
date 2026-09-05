"use client";

// The meetup location field: a plain text input that ALSO searches places.
//
// Free text stays the contract — a host can type "my place, Ladprao soi 5" and
// submit that, exactly as before. Picking a suggestion is the bonus: it fills
// the text AND hands a lat/lng up so the form can drop the map pin, which is
// what turns a meetup into something that shows in map view.
//
// Suggestions come from /api/geocode (Photon behind our own origin — see that
// route for why). The route answers `{ results: [] }` on every failure, so a
// dead upstream leaves an ordinary text input behind rather than a broken form.
//
// Keyboard model matches components/Combobox.tsx (the app's other combobox):
// ArrowDown/Up move, Enter selects, Escape closes, mousedown-preventDefault so
// a click lands before the blur.

import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui";
import { useLocale, useT } from "@/lib/i18n-client";

type Place = { label: string; detail: string; lat: number; lng: number };

const DEBOUNCE_MS = 300;
const MIN_QUERY = 2;
/** Long enough for a click's mousedown→click to land after blur fires. */
const BLUR_CLOSE_MS = 150;

export function LocationSearch({
  value,
  onChange,
  onPick,
  label,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  onPick: (p: { lat: number; lng: number }) => void;
  /** Already translated by the caller, like every other field in the app. */
  label: string;
  placeholder: string;
}) {
  const tr = useT();
  const locale = useLocale();
  const listId = `${useId()}-places`;

  const [results, setResults] = useState<Place[] | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);

  const listRef = useRef<HTMLUListElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Monotonic request id: a slow response for an older keystroke must not
  // overwrite a newer one that already landed.
  const seqRef = useRef(0);
  // The text we just wrote from a selection — searching for it again would
  // just re-offer the thing the host already chose.
  const pickedRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  const q = value.trim();

  // `open` gates the fetch as well as the dropdown: the form writes into this
  // field itself (a map click reverse-geocodes into it), and searching text the
  // host is not even looking at would be a request for nobody.
  useEffect(() => {
    if (!open || q.length < MIN_QUERY || pickedRef.current === value) {
      abortRef.current?.abort();
      abortRef.current = null;
      setResults(null);
      setLoading(false);
      return;
    }
    const timer = setTimeout(() => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const seq = ++seqRef.current;
      setLoading(true);
      fetch(
        `/api/geocode?q=${encodeURIComponent(q)}&lang=${locale}`,
        { signal: controller.signal },
      )
        .then((r) => (r.ok ? r.json() : { results: [] }))
        .then((body: { results?: Place[] }) => {
          if (seq !== seqRef.current) return;
          setResults(Array.isArray(body.results) ? body.results : []);
          setActive(0);
          setLoading(false);
        })
        .catch(() => {
          if (seq !== seqRef.current) return;
          // Aborted or offline — degrade to plain text, say nothing.
          setResults([]);
          setLoading(false);
        });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [open, q, value, locale]);

  // Scroll the highlighted option into view (DOM side effect only).
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[active] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  // The panel also carries the loading and empty states, rather than a line
  // under the field: anything in normal flow here pushes the map down on every
  // keystroke.
  const shown = open && q.length >= MIN_QUERY && (results !== null || loading);

  function select(place: Place) {
    const text = place.detail ? `${place.label}, ${place.detail}` : place.label;
    pickedRef.current = text;
    onChange(text);
    onPick({ lat: place.lat, lng: place.lng });
    setOpen(false);
    setResults(null);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      if (shown) {
        e.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!shown || !results?.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      // Only swallow Enter when a suggestion is genuinely highlighted —
      // otherwise it stays the form's submit key.
      const place = results[active];
      if (place) {
        e.preventDefault();
        select(place);
      }
    }
  }

  return (
    <div className="relative">
      <Input
        id="location"
        name="location"
        label={label}
        fieldSize="sm"
        maxLength={200}
        placeholder={placeholder}
        value={value}
        autoComplete="off"
        role="combobox"
        aria-expanded={shown}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          shown && results?.length ? `${listId}-${active}` : undefined
        }
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onBlur={() => {
          if (blurTimer.current) clearTimeout(blurTimer.current);
          blurTimer.current = setTimeout(() => setOpen(false), BLUR_CLOSE_MS);
        }}
      />

      {shown && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-20 mt-1 max-h-60 overflow-auto rounded-xl border border-line bg-white shadow-lg"
        >
          {/* Stale results stay put during a refetch — no flicker between
              keystrokes. "No places found" only after a search FINISHED empty. */}
          {results === null || (loading && results.length === 0) ? (
            <li className="px-4 py-2.5 text-sm text-ink-muted">
              {tr("Searching…")}
            </li>
          ) : results.length === 0 ? (
            <li className="px-4 py-2.5 text-sm text-ink-muted">
              {tr("No places found")}
            </li>
          ) : (
            results.map((place, i) => (
              <li
                key={`${place.lat},${place.lng},${place.label}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onMouseDown={(e) => {
                  // Beat the blur, or the click never lands.
                  e.preventDefault();
                  select(place);
                }}
                className={`cursor-pointer px-4 py-2.5 ${
                  i === active ? "bg-cream" : ""
                }`}
              >
                <span className="block text-sm text-ink">{place.label}</span>
                {place.detail && (
                  <span className="block text-xs text-ink-muted">
                    {place.detail}
                  </span>
                )}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
