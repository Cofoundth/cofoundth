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

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker } from "leaflet";

// Ladprao — where the team actually is — not the tourist-map city centre.
const DEFAULT_CENTER: [number, number] = [13.8163, 100.5608];

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

  return (
    <div
      ref={ref}
      className="h-[480px] w-full rounded-3xl overflow-hidden shadow-xs bg-gold-soft"
      aria-label="Meetup map"
    />
  );
}

export function MapPicker({
  onPick,
}: {
  onPick: (lat: number | null, lng: number | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const onPickRef = useRef(onPick);
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
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap",
        maxZoom: 19,
      }).addTo(map);
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng(e.latlng);
        } else {
          markerRef.current = L.marker(e.latlng, {
            icon: navyDot(L, "📍"),
          }).addTo(map);
          // Click the pin again to clear it — hosts change their mind.
          markerRef.current.on("click", () => {
            markerRef.current?.remove();
            markerRef.current = null;
            onPickRef.current(null, null);
          });
        }
        onPickRef.current(lat, lng);
      });
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  return (
    <div
      ref={ref}
      className="h-64 w-full rounded-xl overflow-hidden border border-line bg-gold-soft"
    />
  );
}
