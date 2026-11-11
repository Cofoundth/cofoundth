import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicProductAuthors } from "@/lib/posts";
import { FRONT_DOOR_MIN_PRODUCTS } from "@/app/(marketing)/products/shelf-data";
import { webUrl } from "@/app/(marketing)/products/product-view";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";

export const revalidate = 3600; // refresh sitemap hourly

// ── WHAT BELONGS IN HERE ──────────────────────────────────────────────────
// Exactly one rule: a URL in this file must RENDER, with content, for an
// ANONYMOUS visitor, and must not carry `robots: { index: false }`.
//
// Both halves have been violated:
//   - "/browse" sat here for months. It is app/(app)/browse, so the (app)
//     layout 307s a crawler to /login — we were submitting a login wall and
//     allowing it in robots.ts at the same time. Removed.
//   - "/founders" is the PUBLIC founder directory and the obvious swap for it,
//     but app/(marketing)/founders/page.tsx sets `robots: { index: false,
//     follow: false }` on purpose ("real people's names must not become search
//     results"). A sitemap entry for a noindex page is a self-contradicting
//     signal that Search Console reports as an error, so it stays commented
//     out below rather than quietly added.
//
// Every entry in staticRoutes was re-checked against its page file: none of
// them call requireUser/getUser/redirect and none set a robots override.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/products", // the public maker shelf; dropped below once / is serving it
    "/insights",
    "/about",
    "/contact",
    // "/founders", // public, but page-level noindex by design — see above
    // "/events", // hidden until events are real
    "/legal-templates",
    "/code-of-conduct",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency:
      path === "" || path === "/products" ? "daily" : "weekly",
    priority: path === "" ? 1 : path === "/products" ? 0.9 : 0.7,
  }));

  // Published insights (best-effort — sitemap should never crash the build)
  let insightRoutes: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("insights")
      .select("slug, updated_at")
      .eq("status", "published");
    const seen = new Set<string>();
    insightRoutes = (data ?? [])
      .filter((i) => {
        const s = i.slug as string;
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      })
      .map((i) => ({
        url: `${SITE_URL}/insights/${i.slug}`,
        lastModified: i.updated_at
          ? new Date(i.updated_at as string)
          : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    // Env not available at build time — ship static routes only.
  }

  // ── Products: one /p/<id> per publicly visible show_and_tell post ───────
  // Service role bypasses RLS, so EVERY filter is application code and a
  // forgotten one advertises a row to Google.
  //
  // THE AUTHOR GATE IS NOT WRITTEN HERE ON PURPOSE. `publicProductAuthors`
  // (lib/posts.ts) is the shelf's own gate — suspended, is_bot, account_type —
  // and it is exported precisely so this file does not grow a second copy.
  // Two filtered profiles queries that can drift is how a sitemap ends up
  // advertising a URL the page itself refuses to serve, and the drift
  // direction is always the bad one. If the gate should change, change it
  // THERE and both consumers move together.
  //
  // It also fails CLOSED — null on a read error, and an ALLOWLIST rather than
  // a denylist — which is the opposite of suspendedAuthorIds on the member
  // feed, and correct here: a sitemap missing products is recoverable in an
  // hour, one advertising a moderated account is not.
  //
  // The three ROW filters below mirror productsQuery in lib/posts.ts (not
  // exported, so they are duplicated — keep them in step):
  //   kind = 'show_and_tell'  — an ordinary community post or a milestone must
  //                             never reach a public page by this route.
  //   hidden = false          — forum_posts.hidden is the whole moderation
  //                             surface (migration 0043). Without it the
  //                             sitemap would today consist of exactly ONE
  //                             URL: the single show_and_tell row in the
  //                             database is the hidden one.
  //   link_url IS NOT NULL    — a product with nothing to try is not a shelf
  //                             entry, so it is not a sitemap entry either.
  //
  // And in application code, webUrl(): the shelf's own definition of a product
  // (getShelfProducts), so a row with an unusable link cannot count toward
  // FRONT_DOOR_MIN_PRODUCTS below and flip /products out of this file while /
  // is still short of a deck.
  //
  // Deliberately NOT getPublicProductsPage(): that returns a shelf PAGE
  // (limit, newest-first, shaped with author/like/comment joins). A sitemap
  // wants every id and no cap, so it takes the lean row query and borrows only
  // the gate.
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const { data: posts, error: postsError } = await admin
      .from("forum_posts")
      .select("id, author_id, link_url, created_at, updated_at")
      .eq("kind", "show_and_tell")
      .eq("hidden", false)
      .not("link_url", "is", null);
    if (postsError) throw postsError;

    const authorIds = Array.from(
      new Set((posts ?? []).map((p) => p.author_id as string)),
    );
    const visibleAuthors = await publicProductAuthors(authorIds);
    if (!visibleAuthors) throw new Error("public author gate unavailable");

    const seen = new Set<string>();
    productRoutes = (posts ?? [])
      .filter((p) => visibleAuthors.has(p.author_id as string))
      .filter((p) => webUrl(p.link_url as string))
      .filter((p) => {
        const id = p.id as string;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((p) => {
        const stamp = (p.updated_at ?? p.created_at) as string | null;
        return {
          url: `${SITE_URL}/p/${p.id}`,
          lastModified: stamp ? new Date(stamp) : new Date(),
          changeFrequency: "weekly" as const,
          priority: 0.6,
        };
      });
  } catch {
    // Env not available at build time, or a read failed (including the author
    // gate returning null) — ship no product URLs. See the fail-closed note
    // above: this is the safe direction.
  }

  // Once / is serving the shelf, /products canonicalises to / and listing it
  // would submit a URL that says it is not the real one. Counts real rows only,
  // never fixtures. A failed read leaves productRoutes empty, which keeps
  // /products listed: the safe direction, since it is still a working page.
  //
  // This file is cached for an hour (`revalidate` above) and / is per-request,
  // so the sitemap can trail the page by up to that long when the third product
  // arrives. Harmless: the canonical tag is what is live.
  const frontDoorIsShelf = productRoutes.length >= FRONT_DOOR_MIN_PRODUCTS;
  const listedStaticRoutes = frontDoorIsShelf
    ? staticRoutes.filter((r) => r.url !== `${SITE_URL}/products`)
    : staticRoutes;

  return [...listedStaticRoutes, ...insightRoutes, ...productRoutes];
}
