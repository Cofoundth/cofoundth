// Sample products for looking at the /products grid while the real shelf is
// empty. DEVELOPMENT ONLY — `productFixtures()` returns [] when NODE_ENV is
// "production", and nothing here is ever written to a database.
//
// ── WHY THESE ARE NOT ROWS, AND WHY THERE IS NO `test` COLUMN ──────────────
// The obvious version of this is "insert a few test rows and add a boolean so
// production hides them". Three reasons that is the worse answer here:
//
//  1. There is ONE database. The dev server and cofoundee.co read the same
//     Postgres, so a "test" row is a production row wearing a label, and the
//     only thing standing between it and a real visitor is a WHERE clause
//     somebody has to remember in every query that ever touches forum_posts —
//     /products, the /community feed, /dashboard, search, notifications. Miss
//     one and fake products are live on the real site. A file that does not
//     exist in a production build cannot leak into a production query.
//  2. A column added for test data never leaves. It outlives the test data,
//     and the next person reads `hidden = false and test = false` and has to
//     work out which of the two means what.
//  3. forum_posts ALREADY has `hidden`, and the three test accounts are all
//     `suspended = true` — so a test row would be filtered twice over and
//     would not show up in development either, which is the one place it was
//     wanted. Punching a dev-only hole through both guards is more moving
//     parts than this file.
//
// The trade-off, stated plainly: these bypass the real query, so they prove
// the CARD and the GRID render, not that the Supabase filters work. The
// filters were verified separately against a real row. If a product you
// actually posted is not showing, do not debug it on a page that is also
// showing fixtures — set PRODUCTS_FIXTURES=off (below) and reload.
//
// To delete all of this: remove this file and the one `productFixtures()`
// call in page.tsx. Nothing else references it, and no data needs cleaning up.
//
// ── WHY THE SCREENSHOTS ARE DRAWN IN CODE ──────────────────────────────────
// The card leads with a screenshot gallery now, so a fixture with no images
// proves nothing about the surface it exists to prove — it renders the ONE
// shape (coverless) that is already the least interesting. Three ways to give
// these samples pictures, and two of them undo the reasoning above:
//
//   files in public/  — they ship. Everything in public/ is in the production
//                       build, which is the exact leak this module was written
//                       to avoid; it would just be leaking bytes instead of
//                       rows.
//   a placeholder CDN — a network request per card, on the one page you are
//                       looking at BECAUSE you want to see it render. It fails
//                       offline, it fails behind a proxy, and it puts a third
//                       party in the dev loop for a dev-only module.
//   inline data: URIs — no files, no requests, nothing in the build output,
//                       and they cannot outlive this file. What it costs is
//                       that the pictures are drawn in code, which is why
//                       there is a small generator below instead of pasted
//                       blobs.
//
// They are deliberately NOT realistic. A tinted ground, a chrome bar and a few
// blocks reads as "an app" in a 328px column, which is all the grid shows, and
// keeping each one well under a kilobyte keeps the module honest about its
// weight. The per-product tint and the per-image layout are the point: the
// hover preview has to be visibly DOING something, and six near-identical
// greys would make a working gallery look broken.
//
// ⚠️ THE `data:` PREFIX BELOW IS A CONTRACT, not an implementation detail.
// ProductCard's `webUrl()` accepts `http:`/`https:` only — correctly, because
// that parse is what stops a legacy `javascript:` value in a real row becoming
// a one-click injection — so it refuses a data: URI like any other. The card
// carries a narrow exception for these samples instead (ProductCard's
// `imageSrc()`), gated on THREE things: a non-production build, an id that
// starts with FIXTURE_PREFIX, and a src that starts with exactly
// `data:image/svg+xml`. Change what `uri()` emits — base64, a different media
// type, a leading space — and the samples silently go coverless on the one
// page you opened to look at them. Do NOT "fix" that by widening webUrl() for
// every row.

import type { PostItem, ProductCategory } from "@/lib/post-types";

/** Prefix on every fixture id — the card uses it to stamp a TEST badge. */
export const FIXTURE_PREFIX = "fixture-";

export function isFixture(id: string): boolean {
  return id.startsWith(FIXTURE_PREFIX);
}

// ---- The fake screenshot generator ----------------------------------------

// 3:2, matching the card's `aspect-[3/2]` cover box, so nothing is cropped and
// the grid never reflows around a sample.
const SHOT_W = 360;
const SHOT_H = 240;

/** The three colours one fake app is drawn from. */
type Shade = {
  /** The app's page ground. */
  ground: string;
  /** Its header bar, and the darkest ink in the shot. */
  chrome: string;
  /** Content blocks sitting on the ground. */
  block: string;
};

/** Ink on the chrome bar. Not a token on purpose — this is a picture OF
 *  somebody else's app, not a surface in ours, so it must not read as if it
 *  were following (or breaking) the dark-panel vocabulary. */
const CHROME_INK = "#ffffff";

function uri(svg: string): string {
  // encodeURIComponent rather than base64: `#`, `"` and `<` are the only
  // characters here that have to be escaped, the result stays greppable, and
  // there is no Buffer/btoa split to think about between server and client.
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\n\s*/g, ""))}`;
}

/** Ground + header bar, with one layout's body drawn on top. */
function frame(s: Shade, body: string): string {
  return uri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SHOT_W} ${SHOT_H}">
    <rect width="${SHOT_W}" height="${SHOT_H}" fill="${s.ground}"/>
    <rect width="${SHOT_W}" height="36" fill="${s.chrome}"/>
    <rect x="16" y="13" width="64" height="10" rx="5" fill="${CHROME_INK}" opacity=".85"/>
    <rect x="300" y="13" width="44" height="10" rx="5" fill="${CHROME_INK}" opacity=".35"/>
    ${body}
  </svg>`);
}

/** A tenth-precision opacity — `0.18 + 3 * 0.08` is 0.42000000000000004 raw,
 *  and 17 digits of float noise in every shot is pure payload. */
const fade = (n: number) => n.toFixed(2);

/** A list screen: four rows, each an avatar and two lines. */
function rows(s: Shade): string {
  return [0, 1, 2, 3]
    .map((i) => {
      const y = 52 + i * 46;
      return `<rect x="16" y="${y}" width="328" height="38" rx="12" fill="#ffffff" opacity=".92"/>
        <circle cx="39" cy="${y + 19}" r="9" fill="${s.block}"/>
        <rect x="58" y="${y + 10}" width="${150 - i * 22}" height="8" rx="4" fill="${s.chrome}" opacity=".55"/>
        <rect x="58" y="${y + 23}" width="${92 + i * 18}" height="6" rx="3" fill="${s.block}" opacity=".7"/>`;
    })
    .join("");
}

/** A gallery screen: six thumbnails, two up. */
function tiles(s: Shade): string {
  return [0, 1, 2, 3, 4, 5]
    .map((i) => {
      const x = 16 + (i % 3) * 112;
      const y = 54 + Math.floor(i / 3) * 86;
      return `<rect x="${x}" y="${y}" width="104" height="78" rx="12" fill="#ffffff" opacity=".92"/>
        <rect x="${x + 12}" y="${y + 12}" width="56" height="36" rx="8" fill="${s.chrome}" opacity="${fade(0.2 + i * 0.09)}"/>
        <rect x="${x + 12}" y="${y + 56}" width="${78 - i * 7}" height="8" rx="4" fill="${s.block}"/>`;
    })
    .join("");
}

/** A dashboard screen: seven bars on a baseline. */
function bars(s: Shade): string {
  return (
    `<rect x="16" y="52" width="328" height="170" rx="14" fill="#ffffff" opacity=".92"/>` +
    [38, 64, 52, 98, 72, 118, 86]
      .map(
        (h, i) =>
          `<rect x="${38 + i * 42}" y="${194 - h}" width="24" height="${h}" rx="6" fill="${s.chrome}" opacity="${fade(0.3 + i * 0.1)}"/>`,
      )
      .join("") +
    `<rect x="32" y="198" width="296" height="4" rx="2" fill="${s.block}" opacity=".7"/>`
  );
}

/** A detail screen: a hero panel over three lines of copy. */
function hero(s: Shade): string {
  return `<rect x="16" y="52" width="328" height="88" rx="14" fill="${s.chrome}" opacity=".28"/>
    <rect x="140" y="86" width="80" height="20" rx="10" fill="#ffffff" opacity=".9"/>
    <rect x="16" y="156" width="206" height="12" rx="6" fill="${s.chrome}" opacity=".6"/>
    <rect x="16" y="180" width="300" height="8" rx="4" fill="${s.block}"/>
    <rect x="16" y="196" width="244" height="8" rx="4" fill="${s.block}" opacity=".7"/>`;
}

/** A form screen: two fields and a filled button. */
function form(s: Shade): string {
  return `<rect x="16" y="52" width="328" height="170" rx="14" fill="#ffffff" opacity=".92"/>
    <rect x="36" y="76" width="78" height="8" rx="4" fill="${s.block}"/>
    <rect x="36" y="92" width="288" height="26" rx="10" fill="${s.ground}"/>
    <rect x="36" y="130" width="62" height="8" rx="4" fill="${s.block}"/>
    <rect x="36" y="146" width="288" height="26" rx="10" fill="${s.ground}"/>
    <rect x="36" y="186" width="118" height="24" rx="12" fill="${s.chrome}"/>`;
}

const LAYOUTS = { rows, tiles, bars, hero, form } as const;
type Layout = keyof typeof LAYOUTS;

function shotsOf(shade: Shade, layouts: readonly Layout[]): string[] {
  return layouts.map((l) => frame(shade, LAYOUTS[l](shade)));
}

// ---- The samples ----------------------------------------------------------

// Thai-first sample copy, in the register the rest of the app uses: English
// loanwords where a Thai founder would actually say them (app, AI, deploy),
// not translated into officialese. Ladprao matches the app's other mock data.
//
// The image COUNTS are chosen, not arbitrary. A gallery breaks at its edges,
// so the set covers all of them: five (the cap — the picker and any "+n" badge
// have to hold), four, three, two, ONE (nothing to hover to, so the preview
// affordance must not appear at all), and ZERO (no cover box, and the card
// still has to fill its row). The one-image sample is also the only one whose
// picture lives in the LEGACY `image_url` with an empty `image_urls` — that is
// the shape of every real row written before 0076, and it is the regression
// that would otherwise reach production unnoticed, because nothing else on a
// dev machine has that shape.
const SAMPLES: {
  name: string;
  blurb: string;
  // TYPED, not `string`: when the taxonomy last changed, every fixture
  // silently kept a dead slug and fell into "other" with tsc perfectly
  // happy. Now a renamed slug is a compile error.
  category: ProductCategory;
  host: string;
  author: string;
  /** null = a product with no screenshots at all. */
  shots: { shade: Shade; layouts: readonly Layout[] } | null;
  /** Put the single image in `image_url` and leave `image_urls` empty — the
   *  pre-0076 row shape. Only meaningful with exactly one layout. */
  legacy?: true;
}[] = [
  {
    name: "ร้านนี้มีที่จอด",
    blurb:
      "แอปหาที่จอดรถแถวลาดพร้าว บอกว่าตึกไหนจอดฟรีกี่ชั่วโมง ทำเพราะขับวนหาที่จอดทุกวันจนทน",
    category: "lifestyle",
    host: "https://apps.apple.com/th/app/example-parking/id000000000",
    author: "ณัฐพล ว.",
    shots: {
      shade: { ground: "#EEF1EE", chrome: "#2F3A33", block: "#9FB0A4" },
      layouts: ["rows", "hero", "form"],
    },
  },
  {
    name: "Tuk Tuk Rush",
    blurb:
      "เกมขับตุ๊กตุ๊กส่งผู้โดยสารให้ทันเวลา เล่นบนมือถือได้เลย ไม่ต้องโหลด ทำคนเดียวใน 3 เดือน",
    category: "game",
    host: "https://example.itch.io/tuk-tuk-rush",
    author: "Ploy K.",
    // Five: the cap, and the only sample that exercises it.
    shots: {
      shade: { ground: "#F4EDE3", chrome: "#3A2E24", block: "#C8A87C" },
      layouts: ["hero", "tiles", "bars", "rows", "form"],
    },
  },
  {
    name: "สลิปไหน",
    blurb:
      "ลากสลิปโอนเงินลงไป แล้วมันแยกให้เลยว่าใครโอนมาเท่าไหร่ ใช้กับวงแชร์กับกลุ่มทริปได้",
    category: "finance",
    host: "https://slipnai.example.com",
    author: "Somchai T.",
    // ONE image, in the legacy column. See the note on SAMPLES.
    shots: {
      shade: { ground: "#F3F0E9", chrome: "#1B1A17", block: "#B9B3A8" },
      layouts: ["rows"],
    },
    legacy: true,
  },
  {
    name: "ThaiDoc OCR",
    blurb:
      "อ่านเอกสารราชการไทยเป็นข้อความ รองรับลายมือบ้างแล้ว ตอนนี้เปิดให้ลองฟรี มี API ด้วย",
    category: "ai",
    host: "https://thaidoc-ocr.example.dev",
    author: "Warit S.",
    shots: {
      shade: { ground: "#EDEFF4", chrome: "#2B3040", block: "#A9AFC2" },
      layouts: ["form", "rows"],
    },
  },
  {
    name: "Mango Deploy",
    blurb:
      "deploy เว็บขึ้น server ตัวเองด้วยคำสั่งเดียว ทำไว้ใช้เอง แล้วเพื่อนขอใช้ด้วยเลยเปิดให้ลอง",
    category: "developer",
    host: "https://mangodeploy.example.com",
    author: "Ice P.",
    shots: {
      shade: { ground: "#EDF2F1", chrome: "#1F2E2B", block: "#9CB8B2" },
      layouts: ["bars", "rows", "tiles", "hero"],
    },
  },
  {
    name: "เด็กหลังห้อง",
    blurb: "พอดแคสต์คุยกับคนทำของในไทย อัปทุกวันอาทิตย์ ตอนนี้ 12 ตอนแล้ว",
    category: "learning",
    host: "https://open.spotify.com/show/example",
    author: "Bank R.",
    // ZERO, and a plausible zero: a podcast has nothing to screenshot. The
    // card has to look finished without a cover, not broken.
    shots: null,
  },
];

/**
 * Sample products, or [] in production.
 *
 * Set `PRODUCTS_FIXTURES=off` to silence them in development too — useful when
 * you are checking whether a product you really posted comes back from the
 * database, where fixtures on screen would be actively misleading.
 */
export function productFixtures(): PostItem[] {
  if (process.env.NODE_ENV === "production") return [];
  if (process.env.PRODUCTS_FIXTURES === "off") return [];

  // Fixed, descending timestamps. Date.now() would make every render a
  // different "2 minutes ago" and the server/client markup would disagree.
  const base = Date.parse("2026-11-01T09:00:00.000Z");

  return SAMPLES.map((s, i) => {
    const urls = s.shots ? shotsOf(s.shots.shade, s.shots.layouts) : [];
    // Non-legacy samples carry the cover in BOTH columns, because that is what
    // createPostAction writes for a real row (image_url = the first image).
    // Reading either column directly is still wrong — postImages() is the only
    // supported access — but a fixture that does not match the row shape would
    // hide a bug in whichever consumer got it wrong.
    const legacy = s.legacy === true;

    return {
      id: `${FIXTURE_PREFIX}${s.category}`,
      title: s.name,
      content: s.blurb,
      kind: "show_and_tell" as const,
      link_url: s.host,
      image_url: urls[0] ?? null,
      image_urls: legacy ? [] : urls,
      tags: [s.category],
      created_at: new Date(base - i * 36e5).toISOString(),
      author: {
        id: `${FIXTURE_PREFIX}author-${i}`,
        full_name: s.author,
        photo_url: null,
        slug: null,
      },
      // No like/comment affordances and not "yours": a fixture must not look
      // like something you can interact with, because you cannot.
      isOwn: false,
      likeCount: 0,
      myLike: false,
      commentCount: 0,
    };
  });
}
