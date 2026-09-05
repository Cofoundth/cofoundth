"use client";

// Leaflet, loaded client-side only (it touches `window` at import time, so it
// arrives via dynamic import inside an effect). Tiles come from OpenStreetMap
// — already inside the CSP's `img-src https:` — and markers are DIV icons in
// the app palette, so no image assets are involved at all.
//
// Two exports share the setup:
//   MeetupMap    read-only pins for the /meetups?view=map toggle
//   MapPicker    click-to-place pin for the hosting form (both-or-neither
//                with the free-text location; the pin only powers the map)

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import type { LatLngExpression, Map as LeafletMap, Marker } from "leaflet";
// Ladprao. Shared with the geocode proxy, which biases place search to the same
// point — see lib/meetups.ts for why the constant lives there and not here.
import { MEETUP_MAP_CENTER as DEFAULT_CENTER } from "@/lib/meetups";

export type MeetupPin = {
  slug: string;
  title: string;
  lat: number;
  lng: number;
  emoji: string;
};

function navyDot(L: typeof import("leaflet"), emoji: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:34px;height:34px;border-radius:9999px;background:#1B1A17;display:grid;place-items:center;font-size:16px;box-shadow:0 1px 4px rgba(27,26,23,.35);border:2px solid #F3F0E9">${emoji}</div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
}

export function MeetupMap({ pins }: { pins: MeetupPin[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current || mapRef.current) return;
      const map = L.map(ref.current, { scrollWheelZoom: false });
      mapRef.current = map;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);

      if (pins.length === 0) {
        map.setView(DEFAULT_CENTER, 12);
      } else {
        const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng]));
        map.fitBounds(bounds.pad(0.3), { maxZoom: 14 });
      }
      for (const p of pins) {
        L.marker([p.lat, p.lng], { icon: navyDot(L, p.emoji) })
          .addTo(map)
          .bindPopup(
            `<a href="/meetups/${p.slug}" style="font-weight:600;color:#1B1A17;text-decoration:none">${p.title
              .replace(/&/g, "&amp;")
              .replace(/</g, "&lt;")}</a>`,
          );
      }
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // Pins are server-rendered per request; the map mounts once per view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `isolate` for the same reason as MapPicker below — see that comment.
  return (
    <div
      ref={ref}
      className="relative isolate h-[480px] w-full rounded-3xl overflow-hidden shadow-xs bg-gold-soft"
      aria-label="Meetup map"
    />
  );
}

export function MapPicker({
  pin,
  onPick,
}: {
  /** Controlled pin. The location search sets it; the map still overrides it
   *  on click. `null` (or omitted) means no pin. */
  pin?: { lat: number; lng: number } | null;
  onPick: (lat: number | null, lng: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
  // The pin THIS map just placed, as "lat,lng". A map click calls onPick, the
  // parent echoes it back as `pin`, and the sync effect below would then fly
  // the map to a point the user just clicked on — visible, unwanted motion.
  // Recording it here makes the echo a no-op; a pin from anywhere else (the
  // location search) still flies.
  const selfPinRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);
  // Ref writes belong in effects, not render (react-hooks/refs).
  useEffect(() => {
    onPickRef.current = onPick;
  }, [onPick]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !ref.current || mapRef.current) return;
      const map = L.map(ref.current).setView(DEFAULT_CENTER, 13);
      mapRef.current = map;
      leafletRef.current = L;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        selfPinRef.current = `${lat},${lng}`;
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = dropPin(L, map, e.latlng, clearPin);
        }
        onPickRef.current(lat, lng);
      });
      setReady(true);
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
      markerRef.current = null;
      selfPinRef.current = null;
    };
    // `clearPin` is a stable closure over refs only.
  }, []);

  // Click the pin again to clear it — hosts change their mind.
  function clearPin() {
    markerRef.current?.remove();
    markerRef.current = null;
    selfPinRef.current = null;
    onPickRef.current(null, null);
  }

  // Mirror the controlled `pin` onto the map. Effect, never render: this
  // mutates Leaflet.
  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!ready || !L || !map) return;
    if (!pin) {
      markerRef.current?.remove();
      markerRef.current = null;
      selfPinRef.current = null;
      return;
    }
    const key = `${pin.lat},${pin.lng}`;
    if (selfPinRef.current === key) return;
    selfPinRef.current = key;
    const latlng: [number, number] = [pin.lat, pin.lng];
    if (markerRef.current) markerRef.current.setLatLng(latlng);
    else markerRef.current = dropPin(L, map, latlng, clearPin);
    map.flyTo(latlng, 16);
    // `clearPin` is a stable closure over refs only.
  }, [pin, ready]);

  // `isolate` is load-bearing, not decoration. Leaflet stacks its own panes at
  // z-index 400 and its controls at 1000; without a stacking context here those
  // numbers compete directly with everything else on the page, and the location
  // search's z-20 listbox — which overlaps this map — rendered BEHIND the tiles.
  // `isolation: isolate` traps 400/1000 inside this element, which then takes
  // part in the page's stacking order as a single z-auto box that a positive
  // z-index sibling paints over. Fix the container, not the listbox: bidding the
  // listbox up to 1001 would only move the war.
  return (
    <div
      ref={ref}
      className="relative isolate h-64 w-full rounded-xl overflow-hidden border border-line bg-gold-soft"
    />
  );
}

function dropPin(
  L: typeof import("leaflet"),
  map: LeafletMap,
  latlng: LatLngExpression,
  onClear: () => void,
): Marker {
  const marker = L.marker(latlng, { icon: navyDot(L, "📍") }).addTo(map);
  marker.on("click", onClear);
  return marker;
}
