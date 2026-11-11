// Server-only: READING product ratings. Writing is setProductRatingAction /
// clearProductRatingAction in app/(app)/community/[id]/actions.ts.
//
// TWO READS, and they go through two different clients on purpose:
//
//   the PUBLIC rating   average + count, for anybody, anonymous included.
//                       Through the SERVICE ROLE, from product_rating_stats
//                       (migration 0079), which is granted to service_role and
//                       nobody else. RLS cannot serve it: a member's RLS sees
//                       only their own row, and anon sees nothing. The same
//                       posture as the public shelf (lib/posts.ts says why).
//   YOUR rating         one score, for the signed-in member, through THEIR
//                       session client, so RLS (select_own) is what answers.
//                       Never through the service role: that client would
//                       return whatever row the query asked for, and the one
//                       promise this feature makes is that a member's score is
//                       private to them.
//
// ── A FAILED READ IS "UNRATED", NEVER AN ERROR PAGE ───────────────────────
// Ratings are an annotation on a product, not the product. If the read fails
// — 0079 not applied yet (the case in the shared database until the owner
// approves it), a PostgREST hiccup, a missing key — every product renders as
// unrated and the shelf and the product pages stay up. It is LOGGED, once per
// distinct failure per server process: the shelf reads ratings on every
// request, and one line per pageview would bury the log it is meant to be
// found in.

import { createAdminClient } from "@/lib/supabase/admin";
import type { createClient } from "@/lib/supabase/server";
import {
  isRatingScore,
  ratingFromTotals,
  UNRATED,
  type ProductRating,
} from "./post-types";

type DB = Awaited<ReturnType<typeof createClient>>;

const logged = new Set<string>();

function logOnce(read: string, message: string) {
  const key = `${read}\u0000${message}`;
  if (logged.has(key)) return;
  logged.add(key);
  console.error(
    `[product-ratings] ${read} failed; treating products as unrated:`,
    message,
  );
}

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * The public rating of each product in `postIds`. A product with no ratings is
 * simply absent from the map — read it with `?? UNRATED`.
 *
 * Pass REAL forum_posts ids only. The column is a uuid, so one non-uuid in the
 * list (a dev fixture's `fixture-…` id) fails the whole read with 22P02 and
 * every product on the page would come back unrated.
 */
export async function getProductRatings(
  postIds: readonly string[],
): Promise<Map<string, ProductRating>> {
  const out = new Map<string, ProductRating>();
  if (!postIds.length) return out;
  try {
    const { data, error } = await createAdminClient()
      .from("product_rating_stats")
      .select("post_id, rating_count, rating_sum")
      .in("post_id", [...postIds]);
    if (error) {
      logOnce("public rating read", error.message);
      return out;
    }
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      out.set(
        row.post_id as string,
        ratingFromTotals(Number(row.rating_sum), Number(row.rating_count)),
      );
    }
  } catch (e) {
    logOnce("public rating read", messageOf(e));
  }
  return out;
}

/** One product's public rating. */
export async function getProductRating(postId: string): Promise<ProductRating> {
  return (await getProductRatings([postId])).get(postId) ?? UNRATED;
}

/**
 * The signed-in member's own scores for the products in `postIds`, for the
 * deck's review modal, which prefills the stars with them. One read for the
 * whole shelf instead of one per card. A product they have not rated is
 * absent; a failed read is an empty map (every modal opens with no stars), for
 * the same reason as below. Through the member's OWN client, so RLS's
 * select_own is what answers, as for getMyProductRating. REAL ids only — see
 * getProductRatings.
 */
export async function getMyProductRatings(
  supabase: DB,
  postIds: readonly string[],
  userId: string,
): Promise<Map<string, number>> {
  const out = new Map<string, number>();
  if (!postIds.length) return out;
  try {
    const { data, error } = await supabase
      .from("product_ratings")
      .select("post_id, score")
      .eq("user_id", userId)
      .in("post_id", [...postIds]);
    if (error) {
      logOnce("own ratings read", error.message);
      return out;
    }
    for (const row of (data ?? []) as Record<string, unknown>[]) {
      if (isRatingScore(row.score)) out.set(row.post_id as string, row.score);
    }
  } catch (e) {
    logOnce("own ratings read", messageOf(e));
  }
  return out;
}

/**
 * The signed-in member's own score for this product (1–5), or null when they
 * have not rated it — or when the read failed, which renders the same empty
 * stars rather than taking the page down. `supabase` MUST be the member's own
 * session client (see the header).
 */
export async function getMyProductRating(
  supabase: DB,
  postId: string,
  userId: string,
): Promise<number | null> {
  try {
    const { data, error } = await supabase
      .from("product_ratings")
      .select("score")
      .eq("post_id", postId)
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      logOnce("own rating read", error.message);
      return null;
    }
    const score = (data as { score?: unknown } | null)?.score;
    return isRatingScore(score) ? score : null;
  } catch (e) {
    logOnce("own rating read", messageOf(e));
    return null;
  }
}
