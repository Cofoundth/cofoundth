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

import type { PostItem } from "@/lib/post-types";

/** Prefix on every fixture id — the card uses it to stamp a TEST badge. */
export const FIXTURE_PREFIX = "fixture-";

export function isFixture(id: string): boolean {
  return id.startsWith(FIXTURE_PREFIX);
}

// Thai-first sample copy, in the register the rest of the app uses: English
// loanwords where a Thai founder would actually say them (app, AI, deploy),
// not translated into officialese. Ladprao matches the app's other mock data.
const SAMPLES: {
  name: string;
  blurb: string;
  category: string;
  host: string;
  author: string;
}[] = [
  {
    name: "ร้านนี้มีที่จอด",
    blurb:
      "แอปหาที่จอดรถแถวลาดพร้าว บอกว่าตึกไหนจอดฟรีกี่ชั่วโมง ทำเพราะขับวนหาที่จอดทุกวันจนทน",
    category: "app",
    host: "https://apps.apple.com/th/app/example-parking/id000000000",
    author: "ณัฐพล ว.",
  },
  {
    name: "Tuk Tuk Rush",
    blurb:
      "เกมขับตุ๊กตุ๊กส่งผู้โดยสารให้ทันเวลา เล่นบนมือถือได้เลย ไม่ต้องโหลด ทำคนเดียวใน 3 เดือน",
    category: "game",
    host: "https://example.itch.io/tuk-tuk-rush",
    author: "Ploy K.",
  },
  {
    name: "สลิปไหน",
    blurb:
      "ลากสลิปโอนเงินลงไป แล้วมันแยกให้เลยว่าใครโอนมาเท่าไหร่ ใช้กับวงแชร์กับกลุ่มทริปได้",
    category: "tool",
    host: "https://slipnai.example.com",
    author: "Somchai T.",
  },
  {
    name: "ThaiDoc OCR",
    blurb:
      "อ่านเอกสารราชการไทยเป็นข้อความ รองรับลายมือบ้างแล้ว ตอนนี้เปิดให้ลองฟรี มี API ด้วย",
    category: "ai",
    host: "https://thaidoc-ocr.example.dev",
    author: "Warit S.",
  },
  {
    name: "Mango Deploy",
    blurb:
      "deploy เว็บขึ้น server ตัวเองด้วยคำสั่งเดียว ทำไว้ใช้เอง แล้วเพื่อนขอใช้ด้วยเลยเปิดให้ลอง",
    category: "web",
    host: "https://mangodeploy.example.com",
    author: "Ice P.",
  },
  {
    name: "เด็กหลังห้อง",
    blurb: "พอดแคสต์คุยกับคนทำของในไทย อัปทุกวันอาทิตย์ ตอนนี้ 12 ตอนแล้ว",
    category: "other",
    host: "https://open.spotify.com/show/example",
    author: "Bank R.",
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

  return SAMPLES.map((s, i) => ({
    id: `${FIXTURE_PREFIX}${s.category}`,
    title: s.name,
    content: s.blurb,
    kind: "show_and_tell" as const,
    link_url: s.host,
    image_url: null,
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
  }));
}
