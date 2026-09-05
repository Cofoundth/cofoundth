// Geocoding proxy for the meetup location field.
//
// WHY A PROXY AT ALL: the field autocompletes as you type, and Nominatim's
// usage policy forbids exactly that from a browser. Photon (komoot's OSM
// geocoder) is built for autocomplete, so it is the upstream — but calling it
// from the client would still mean widening the CSP's `connect-src 'self'`
// (proxy.ts:34) to a third-party host. Going through our own origin keeps the
// policy untouched and puts the User-Agent, the timeout, and a small shared
// cache in one place.
//
// TWO MODES, one handler:
//   ?q=<text>&lang=…       forward search, biased to the team's Ladprao base
//   ?lat=&lng=&lang=…      reverse, for "you clicked here, what is it called?"
//
// LANGUAGE: Photon has no Thai `lang`. Omitting the parameter returns OSM's
// default `name`, which in Thailand IS Thai — so the Thai locale wants NO lang
// at all, and only `en` is passed through. Verified against the live API:
// `?q=siam paragon` returns street "ถนนพระรามที่ 1", `&lang=en` returns
// "Rama I Road".
//
// FAILURE IS NOT AN ERROR: every failure path returns `{ results: [] }` with
// status 200. The field must degrade to a plain text input, never break the
// host-a-meetup form.
//
// No `export const dynamic` here on purpose — reading `request.url` already
// makes this a normal per-request handler, and route handlers are uncached by
// default.

import { MEETUP_MAP_CENTER } from "@/lib/meetups";

const PHOTON = "https://photon.komoot.io";
const USER_AGENT = "Cofoundee/1.0 (https://cofoundee.co)";
const UPSTREAM_TIMEOUT_MS = 5000;
const MIN_QUERY = 2;
const MAX_QUERY = 120;
const LIMIT = 5;
/** Entries, not bytes. FIFO — a keystroke prefix stops being useful quickly. */
const CACHE_MAX = 500;
const CACHE_HEADERS = { "Cache-Control": "public, max-age=86400" };

const [BIAS_LAT, BIAS_LNG] = MEETUP_MAP_CENTER;
// Thailand, as minLon,minLat,maxLon,maxLat. A HARD fence on search, because the
// lat/lon bias above is only a soft nudge: `siam paragon` came back five rows
// deep with three of them in Evanston Illinois, Midlothian Virginia and East
// Molesey Surrey — all noise, since a Cofoundee meetup happens in Thailand
// (CLAUDE.md: build for Thailand first). SEARCH ONLY — reverse geocoding is
// already pinned by the coordinates the caller hands it, and fencing it would
// just make an out-of-country click silently nameless.
const TH_BBOX = "97.3,5.6,105.7,20.5";

export type GeocodeResult = {
  label: string;
  detail: string;
  lat: number;
  lng: number;
};

// Process-local and deliberately tiny: this is a keystroke de-duplicator, not a
// durable cache. It survives only as long as the serverless instance does,
// which is exactly the window in which a user is typing.
const cache = new Map<string, GeocodeResult[]>();

function remember(key: string, results: GeocodeResult[]) {
  if (cache.has(key)) return;
  cache.set(key, results);
  // Map iterates in insertion order, so the first key is the oldest.
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

function ok(results: GeocodeResult[]) {
  return Response.json({ results }, { headers: CACHE_HEADERS });
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

type PhotonFeature = {
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: unknown };
};

// Photon's shape, from the live payloads (see the header comment):
//   search  { name, street?, locality, district, city, state?, … }
//   reverse { housenumber, street, locality, district, city, state, … } — often
//           with NO `name` at all, so the address has to become the label.
function normalise(feature: PhotonFeature): GeocodeResult | null {
  const p = feature.properties ?? {};
  // GeoJSON is [lon, lat] — the order trips people up, so it is spelled out.
  const coords = feature.geometry?.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;

  const street = text(p.street);
  const city = text(p.city);
  const label =
    text(p.name) ||
    [text(p.housenumber), street].filter(Boolean).join(" ") ||
    city ||
    text(p.state);
  if (!label) return null;

  // Dedupe two ways, both of which happen in real Bangkok payloads:
  //   - against the label — a reverse hit's label is "1693 ถนนพหลโยธิน", so the
  //     bare street would repeat inside it (substring, not equality)
  //   - against each other — Bangkok returns city === state === "กรุงเทพมหานคร"
  const haystack = label.toLowerCase();
  const seen = new Set<string>();
  const keep = (part: string) => {
    const key = part.toLowerCase();
    if (!part || seen.has(key) || haystack.includes(key)) return false;
    seen.add(key);
    return true;
  };

  const parts = [street, text(p.district), city].filter((part) => keep(part));
  // `state` is the coarsest field and only earns a slot when one of the nearer
  // three is missing. Photon leaves Thai provinces untranslated even under
  // `lang=en`, so a complete Bangkok row would otherwise end
  // "…, Bangkok, กรุงเทพมหานคร"; a US row (city Evanston, no district) still
  // gets its disambiguating "…, Evanston, Illinois".
  const state = text(p.state);
  if (parts.length < 3 && keep(state)) parts.push(state);

  return { label, detail: parts.join(", "), lat, lng };
}

/** `null` means the upstream failed — distinct from a genuine zero-result hit,
 *  which must not be cached as if it were an answer. */
async function photon(path: string): Promise<GeocodeResult[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    const res = await fetch(`${PHOTON}${path}`, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body: unknown = await res.json();
    const features = (body as { features?: unknown })?.features;
    if (!Array.isArray(features)) return null;
    return features
      .map((f) => normalise(f as PhotonFeature))
      .filter((r): r is GeocodeResult => r !== null);
  } catch {
    // Abort, DNS, TLS, malformed JSON — all the same to the caller.
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get("lang") === "en" ? "en" : "th";
  const langParam = lang === "en" ? "&lang=en" : "";

  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");

  if (latRaw !== null && lngRaw !== null) {
    const lat = Number(latRaw);
    const lng = Number(lngRaw);
    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      Math.abs(lat) > 90 ||
      Math.abs(lng) > 180
    ) {
      return ok([]);
    }
    // ~1m of precision is plenty to collapse repeat lookups of one map click.
    const key = `r:${lang}:${lat.toFixed(5)},${lng.toFixed(5)}`;
    const hit = cache.get(key);
    if (hit) return ok(hit);
    const results = await photon(`/reverse?lat=${lat}&lon=${lng}${langParam}`);
    if (results === null) return ok([]);
    remember(key, results);
    return ok(results);
  }

  const q = (searchParams.get("q") ?? "").trim().slice(0, MAX_QUERY);
  if (q.length < MIN_QUERY) return ok([]);

  const key = `q:${lang}:${q.toLowerCase()}`;
  const hit = cache.get(key);
  if (hit) return ok(hit);

  const results = await photon(
    `/api/?q=${encodeURIComponent(q)}&limit=${LIMIT}` +
      `&lat=${BIAS_LAT}&lon=${BIAS_LNG}&bbox=${TH_BBOX}${langParam}`,
  );
  if (results === null) return ok([]);
  remember(key, results);
  return ok(results);
}
