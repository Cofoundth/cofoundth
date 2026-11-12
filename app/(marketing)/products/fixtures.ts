// Sample products for looking at the /products deck while the real shelf is
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
//     /products, the /community feed, search, notifications. Miss
//     one and fake products are live on the real site. A file that does not
//     exist in a production build cannot leak into a production query.
//  2. A column added for test data never leaves. It outlives the test data,
//     and the next person reads `hidden = false and test = false` and has to
//     work out which of the two means what.
//  3. forum_posts ALREADY has `hidden`, and the three test accounts are all
//     `suspended = true` — so a test row is filtered out of every public
//     surface in production. That reasoning is why these samples exist; it
//     is no longer the whole story. The samples cannot be SAVED (no row), so
//     the review modal could not be tried for real, and the founder asked for
//     exactly that. So there is now ONE narrow development-only hole, through
//     the author guard and only that guard: lib/test-accounts.ts lets a
//     non-hidden PRODUCT by one of those three accounts onto the shelf, the
//     deck, /p/<id> and /community/<id> in development. Point 1 still holds
//     for everything else: such a row is a production row, and only the
//     production code's own filters keep it off the live site — so check
//     what the DEPLOYED code would do with it before inserting one.
//
// The trade-off, stated plainly: these bypass the real query, so they prove
// the DECK and its CARD render, not that the Supabase filters work. The
// filters were verified separately against a real row. If a product you
// actually posted is not showing, do not debug it on a page that is also
// showing fixtures — set PRODUCTS_FIXTURES=off (below) and reload.
//
// THE PRODUCT PAGE AND THE REVIEW MODAL TOO, so the whole flow can be looked
// at. A card's rating-and-comments row opens /p/<id>, and a fixture has no row
// there to find: in development app/(marketing)/p/[id]/page.tsx asks
// `findFixture()` first and renders the sample's page from it — its images,
// description, link and rating, with no comments. Nothing on it saves
// anything (there is no row to write to): a logged-out visitor's like,
// comment and rate buttons only open the join dialog, and a signed-in member
// gets no stars. Trying a sample from the deck opens its placeholder link in a
// new tab (mostly *.example.* hosts that do not resolve), and the review modal
// that follows opens with send disabled and a sentence
// saying a sample is not saved (`sample` in ./ProductShelf.tsx, read by
// ./DeckPrompts.tsx). In a production build `findFixture()` returns null
// before it looks and there are no samples on the deck, so none of this can
// render.
//
// To delete all of this: remove this file, the one `productFixtures()` call in
// shelf-data.ts, the `findFixture()` branch in app/(marketing)/p/[id]/page.tsx,
// the `isFixture` check in product-view.ts and the two in ProductShelf.tsx
// (the own-ratings read and `sample`), and `sample` in DeckPrompts.tsx. No
// data needs cleaning up.
//
// ── WHY THE SCREENSHOTS ARE DRAWN IN CODE ──────────────────────────────────
// The card leads with a cover, so a fixture with no image proves nothing about
// the surface it exists to prove — it renders the ONE shape (coverless) that is
// already the least interesting. Three ways to give these samples pictures,
// and two of them undo the reasoning above:
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
// blocks reads as "an app" at any size the deck card is drawn, and
// keeping each one well under a kilobyte keeps the module honest about its
// weight. The per-product tint and layout are the point: a swipe has to look
// like it changed something, and near-identical greys would hide that.
//
// ⚠️ THE `data:` PREFIX BELOW IS A CONTRACT, not an implementation detail.
// `webUrl()` in ./product-view.ts accepts `http:`/`https:` only — correctly,
// because that parse is what stops a legacy `javascript:` value in a real row
// becoming a one-click injection — so it refuses a data: URI like any other.
// That module carries a narrow exception for these samples instead
// (`imageSrc()`), gated on THREE things: a non-production build, an id that
// starts with FIXTURE_PREFIX, and a src that starts with exactly
// `data:image/svg+xml`. Change what `uri()` emits — base64, a different media
// type, a leading space — and the samples silently go coverless on the one
// page you opened to look at them. Do NOT "fix" that by widening webUrl() for
// every row.

import {
  ratingFromTotals,
  UNRATED,
  type ProductCategory,
  type ProductItem,
} from "@/lib/post-types";

/** Prefix on every fixture id. A uuid cannot start with it, so it is what
 *  tells a page a product has no row: /p/<id> renders it from this module
 *  (findFixture, development only), and it is the one place a `data:` image is
 *  allowed (./product-view.ts). */
export const FIXTURE_PREFIX = "fixture-";

export function isFixture(id: string): boolean {
  return id.startsWith(FIXTURE_PREFIX);
}

// ---- The fake screenshot generator ----------------------------------------

// 3:2, the shape of a product page's gallery box. The deck card letterboxes any
// shape (`contain` over a blurred backdrop), so nothing is cropped there either.
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
// The image COUNTS span the shapes a real row can have, and the top card shows
// all of them (arrows on a hovering pointer, a one-second autoplay on a phone;
// the cards behind show the first): five (the cap), four, three, two, ONE (no
// dots, no arrows, no autoplay), and ZERO (no cover, and the card still has to
// look finished). The one-image samples are also the only ones whose picture
// lives in the LEGACY `image_url` with an empty `image_urls` — that is the
// shape of every real row written before 0076, and it is the regression that
// would otherwise reach production unnoticed, because nothing else on a dev
// machine has that shape.
//
// The footer's numbers are spread the same way: ratings none / one / many (up
// to four digits, for the width of "4.4 (1,204)"), and comments zero, one and
// up to three digits.
const SAMPLES: {
  name: string;
  blurb: string;
  // TYPED, not `string`: when the taxonomy last changed, every fixture
  // silently kept a dead slug and fell into "other" with tsc perfectly
  // happy. Now a renamed slug is a compile error.
  category: ProductCategory;
  host: string;
  author: string;
  /** The public rating as the database would aggregate it (product_rating_stats
   *  is a COUNT and a SUM), run through the same ratingFromTotals() as a real
   *  row. Absent = nobody has rated it. The spread is deliberate: none, ONE
   *  (the average a single rater gives away), a .x5 case that must round up
   *  (17/4 = 4.25 -> 4.3), and counts up to four digits for the width of
   *  "4.4 (1,204)". */
  rated?: { count: number; sum: number };
  /** The comment count the card's footer shows. Made up: a fixture has no
   *  conversation, and its page (findFixture) shows none. */
  comments: number;
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
    comments: 3,
    rated: { count: 12, sum: 52 },
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
    comments: 1,
    rated: { count: 1, sum: 5 },
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
    comments: 0,
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
    comments: 12,
    rated: { count: 37, sum: 141 },
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
    comments: 0,
    rated: { count: 2, sum: 7 },
    shots: {
      shade: { ground: "#EDF2F1", chrome: "#1F2E2B", block: "#9CB8B2" },
      layouts: ["bars", "rows", "tiles", "hero"],
    },
  },
  // The five below give the games filter a deck worth judging. One has no cover,
  // one a name near the 60-character cap (not on the card any more, but in its
  // accessible name and the live region) and a description at the 160 cap, and
  // one the legacy single-image row shape the deck must read like any other.
  {
    name: "แมวส้มปากซอย",
    blurb:
      "เกมเลี้ยงแมวส้มหน้าร้านข้าวแกงปากซอยลาดพร้าว 71 ให้อ้วนที่สุดก่อนป้าเจ้าของร้านกลับมา",
    category: "game",
    host: "https://orange-cat-ladprao.example.com",
    author: "Mint A.",
    comments: 48,
    rated: { count: 128, sum: 589 },
    shots: {
      shade: { ground: "#F6EBDD", chrome: "#4A3320", block: "#D9A36B" },
      layouts: ["tiles", "hero"],
    },
  },
  {
    name: "ผจญภัยรถสองแถวลาดพร้าววังหิน ตามหาคิวสุดท้ายก่อนฝนจะตก",
    // Exactly MAX_PRODUCT_BLURB (160) characters: the longest description a
    // card can be given, so the clamp (three lines on a phone) has something
    // to do.
    blurb:
      "เกมผจญภัยบนรถสองแถว ต้องเลือกซอยให้ถูกก่อนฝนลง มีทั้งหมด 12 ด่าน เก็บเหรียญไว้ซื้อร่ม เล่นได้ทั้งบนมือถือและคอม ชื่อยาวหน่อยเพราะเรื่องมันยาวจริง ๆ ลองแล้วบอกนะ",
    category: "game",
    host: "https://songthaew-quest.example.com",
    author: "ธนกฤต จ.",
    comments: 2,
    shots: {
      shade: { ground: "#E9EEF0", chrome: "#26343B", block: "#93A9B3" },
      layouts: ["hero", "bars", "form"],
    },
  },
  {
    name: "ทายชื่อซอย",
    blurb: "เกมคำศัพท์ ทายชื่อซอยในลาดพร้าวจากคำใบ้วันละข้อ เล่นจบใน 2 นาที",
    category: "game",
    host: "https://guess-the-soi.example.com",
    author: "Fah N.",
    comments: 0,
    rated: { count: 1, sum: 2 },
    // No cover: a word game has nothing to screenshot.
    shots: null,
  },
  {
    name: "Ladprao Dash",
    blurb: "วิ่งหลบวินมอเตอร์ไซค์บนฟุตบาทลาดพร้าว คะแนนรีเซ็ตทุกครั้งที่ตกท่อ",
    category: "game",
    host: "https://ladprao-dash.example.com",
    author: "Nop C.",
    comments: 7,
    rated: { count: 9, sum: 28 },
    shots: {
      shade: { ground: "#F1EFE8", chrome: "#33302A", block: "#BDB5A4" },
      layouts: ["bars", "tiles", "rows", "hero"],
    },
  },
  {
    name: "หมูกระทะ Tycoon",
    blurb: "เปิดร้านหมูกระทะแถวลาดพร้าว คุมเตาคุมคิวให้ทันก่อนลูกค้าเดินไปร้านข้าง ๆ",
    category: "game",
    host: "https://mookrata-tycoon.example.com",
    author: "Beam L.",
    comments: 1,
    rated: { count: 4, sum: 17 },
    shots: {
      shade: { ground: "#F5ECE6", chrome: "#40271E", block: "#CFA591" },
      layouts: ["rows"],
    },
    legacy: true,
  },
  {
    name: "เด็กหลังห้อง",
    blurb: "พอดแคสต์คุยกับคนทำของในไทย อัปทุกวันอาทิตย์ ตอนนี้ 12 ตอนแล้ว",
    category: "learning",
    host: "https://open.spotify.com/show/example",
    author: "Bank R.",
    comments: 230,
    rated: { count: 1204, sum: 5297 },
    // ZERO, and a plausible zero: a podcast has nothing to screenshot. The
    // card has to look finished without a cover, not broken.
    shots: null,
  },
];

/**
 * The sample with this id, or null — ALWAYS null in a production build, where
 * the check below folds to a constant and the lookup is never reached. For
 * app/(marketing)/p/[id]/page.tsx, which renders a sample's product page in
 * development so the card's rating-and-comments row has somewhere to land.
 */
export function findFixture(id: string): ProductItem | null {
  if (process.env.NODE_ENV === "production") return null;
  if (!isFixture(id)) return null;
  return productFixtures().find((p) => p.id === id) ?? null;
}

/**
 * Sample products, or [] in production.
 *
 * Set `PRODUCTS_FIXTURES=off` to silence them in development too — useful when
 * you are checking whether a product you really posted comes back from the
 * database, where fixtures on screen would be actively misleading.
 */
export function productFixtures(): ProductItem[] {
  if (process.env.NODE_ENV === "production") return [];
  if (process.env.PRODUCTS_FIXTURES === "off") return [];

  // Fixed, descending timestamps. Date.now() would make every render a
  // different "2 minutes ago" and the server/client markup would disagree.
  const base = Date.parse("2026-11-01T09:00:00.000Z");

  return SAMPLES.map((s, i) => {
    const urls = s.shots ? shotsOf(s.shots.shade, s.shots.layouts) : [];
    // Non-legacy samples carry the cover in BOTH columns, because that is what
    // createProductAction writes for a real row (image_url = the first image).
    // Reading either column directly is still wrong — postImages() is the only
    // supported access — but a fixture that does not match the row shape would
    // hide a bug in whichever consumer got it wrong.
    const legacy = s.legacy === true;

    return {
      // The index too: several samples share a category.
      id: `${FIXTURE_PREFIX}${s.category}-${i}`,
      title: s.name,
      content: s.blurb,
      kind: "show_and_tell" as const,
      link_url: s.host,
      image_url: urls[0] ?? null,
      image_urls: legacy ? [] : urls,
      tags: [s.category],
      // "Not said", like every product added before 0080: the samples link
      // to ordinary sites, so none of them is a phone-only app.
      platforms: [],
      created_at: new Date(base - i * 36e5).toISOString(),
      author: {
        id: `${FIXTURE_PREFIX}author-${i}`,
        full_name: s.author,
        photo_url: null,
        slug: null,
      },
      // Not "yours" and no likes: a fixture must not look like something you
      // can interact with, because you cannot. The comment count is shown,
      // because the card's footer is half of what a card is now; the
      // fixture's page shows no comments, because there are none to show.
      isOwn: false,
      likeCount: 0,
      myLike: false,
      commentCount: s.comments,
      rating: s.rated
        ? ratingFromTotals(s.rated.sum, s.rated.count)
        : UNRATED,
    };
  });
}
