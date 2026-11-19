"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account";
import { getBlockedIds, isBlockedEitherWay } from "@/lib/blocking";
import {
  isCommentCursor,
  readCommentBatch,
  type CommentCursor,
  type ThreadComment,
} from "@/lib/comment-thread";
import { isRatingScore, LIKE_BEFORE_RATING, productPath } from "@/lib/post-types";
import { readProductLike } from "@/lib/product-likes";
import { canRate, LIKED_PRODUCTS_PATH, MY_PRODUCTS_PATH } from "@/lib/roles";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Likes ----------------------------------------------------------

// NO role gate, deliberately: every role may like (lib/roles.ts canLike). The
// self-scoped delete at the bottom of this file is open for the same reason.
export async function toggleLikeAction(postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("forum_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("forum_likes")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("forum_likes")
      .insert({ post_id: postId, user_id: user.id });
  }

  revalidatePath(`/community/${postId}`);
  revalidatePath(`/community`);
  // A product's like lives on its own page.
  revalidatePath(productPath(postId));
  revalidatePath(LIKED_PRODUCTS_PATH);
}

/** A deck like keeps the product liked when the gesture is repeated. */
export async function likeProductAction(postId: string): Promise<{ error: string } | null> {
  if (typeof postId !== "string" || !UUID.test(postId))
    return { error: "The product isn’t available" };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to like products." };

  const { data: product } = await supabase
    .from("forum_posts")
    .select("author_id")
    .eq("id", postId)
    .eq("kind", "show_and_tell")
    .eq("hidden", false)
    .maybeSingle();
  if (!product || (await isBlockedEitherWay(user.id, product.author_id)))
    return { error: "The product isn’t available" };

  const { error } = await supabase.from("forum_likes").upsert(
    { post_id: postId, user_id: user.id },
    { onConflict: "post_id,user_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[product.like]", error.message);
    return { error: "Couldn’t save your like. Try again." };
  }

  revalidateProduct(postId);
  return null;
}

// --- Product ratings ------------------------------------------------
// CLAUDE.md, "Founder decision (2026-11-10)": 1–5 stars, given deliberately on
// the product's page (./RatingControl.tsx) or in the deck's review modal after
// trying it (app/(marketing)/products/DeckPrompts.tsx) — both call this one
// action — one per member per product, changeable, never on your own
// product, private to the rater. The table and its RLS are migration 0079.
//
// EVERY RULE IS CHECKED HERE AND AGAIN IN RLS. A server action is invocable
// without rendering the page it belongs to, with any arguments at all, so these
// checks are the real refusal for anyone using the app — and 0079's WITH CHECK
// is the backstop for anyone holding a member's JWT and calling PostgREST
// directly. Both clauses must keep saying the same thing.
//
// Errors are English source strings; the control translates them with tr(),
// the same convention as the comment composer.

export type RatingState = { error?: string } | null;

/** Every path a product's rating is shown on. `/` and `/products` render the
 *  shelf, /products/<id> is the product's page and /products/mine lists the
 *  maker's own. */
function revalidateProduct(postId: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(productPath(postId));
  revalidatePath(MY_PRODUCTS_PATH);
  revalidatePath(LIKED_PRODUCTS_PATH);
}

export async function setProductRatingAction(
  postId: string,
  score: number,
): Promise<RatingState> {
  // Validated before anything is read: the arguments are whatever the caller
  // sent, not what the star buttons can produce.
  if (typeof postId !== "string" || !UUID.test(postId))
    return { error: "This can’t be rated." };
  if (!isRatingScore(score))
    return { error: "Pick between 1 and 5 stars." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to rate." };

  if (!canRate(await getAccountRole(supabase, user.id)))
    return { error: "Your account can’t rate products." };

  // Through the member's OWN client: forum_posts is `using (true)` for
  // authenticated, and these are exactly the columns 0079's WITH CHECK reads.
  const { data: post } = await supabase
    .from("forum_posts")
    .select("author_id, kind, hidden")
    .eq("id", postId)
    .maybeSingle();
  if (!post || post.kind !== "show_and_tell" || post.hidden !== false)
    return { error: "This can’t be rated." };
  if (post.author_id === user.id)
    return { error: "You can’t rate your own product." };

  // NOT in 0079 and NOT in the spec's refusal list — an addition, for the same
  // reason /community/<id> 404s a blocked pair: a blocked pair disappears from
  // each other everywhere, so the person who blocked you does not get a score
  // from you through a direct call to this action.
  if (await isBlockedEitherWay(user.id, post.author_id as string))
    return { error: "This can’t be rated." };

  const { data: like, error: likeError } = await readProductLike(supabase, user.id, postId);
  if (likeError) {
    console.error("[product_ratings.like]", likeError.message);
    return { error: "Couldn’t save your rating. Try again." };
  }
  if (!like) return { error: LIKE_BEFORE_RATING };

  // One row per (post_id, user_id): a first rating inserts, a changed one
  // overwrites. 0079 grants UPDATE on all three payload columns because this
  // is PostgREST's merge-duplicates, which re-sets the key columns too.
  const { error } = await supabase
    .from("product_ratings")
    .upsert(
      { post_id: postId, user_id: user.id, score },
      { onConflict: "post_id,user_id" },
    );
  if (error) {
    console.error("[product_ratings.upsert]", error.message);
    return { error: "Couldn’t save your rating. Try again." };
  }

  revalidateProduct(postId);
  return null;
}

/**
 * Remove your own rating. Deliberately NOT gated on the product still being
 * rateable: it is the member's own data, so a rating on a post that has since
 * been hidden can still be taken back (0079's delete policy agrees).
 */
export async function clearProductRatingAction(
  postId: string,
): Promise<RatingState> {
  if (typeof postId !== "string" || !UUID.test(postId))
    return { error: "This can’t be rated." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to rate." };

  if (!canRate(await getAccountRole(supabase, user.id)))
    return { error: "Your account can’t rate products." };

  const { error } = await supabase
    .from("product_ratings")
    .delete()
    .eq("post_id", postId)
    .eq("user_id", user.id);
  if (error) {
    console.error("[product_ratings.delete]", error.message);
    return { error: "Couldn’t remove your rating. Try again." };
  }

  revalidateProduct(postId);
  return null;
}

// --- Comments -------------------------------------------------------
//
// Writing one is lib/post-actions.ts createPostCommentAction, for every
// surface (this page's composer, the feed card, the product page, the deck's
// review modal). The twin that used to sit here had no caller and skipped the
// block check, so it was removed rather than kept in step.

// --- Comments: the earlier batches -----------------------------------

const POST_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The batch before `before` in a post's thread (components/CommentThread.tsx
 *  "Show earlier comments"). Signed in only: a visitor gets the preview, not
 *  the thread. The same block rules as the pages: nothing on a post whose
 *  author and reader have blocked each other, and no comment by anyone either
 *  of them blocked. */
export async function loadEarlierCommentsAction(
  postId: string,
  before: CommentCursor,
): Promise<
  | { comments: ThreadComment[]; hasEarlier: boolean; cursor: CommentCursor | null }
  | { error: string }
> {
  if (typeof postId !== "string" || !POST_ID.test(postId) || !isCommentCursor(before)) {
    return { error: "Something went wrong. Try again." };
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { comments: [], hasEarlier: false, cursor: null };

  const { data: post } = await supabase
    .from("forum_posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post || (await isBlockedEitherWay(user.id, post.author_id as string))) {
    return { comments: [], hasEarlier: false, cursor: null };
  }
  try {
    return await readCommentBatch(supabase, {
      postId,
      viewerId: user.id,
      blocked: await getBlockedIds(user.id),
      before: { createdAt: before.createdAt, id: before.id },
    });
  } catch (e) {
    console.error("[comments.earlier]", e);
    return { error: "Something went wrong. Try again." };
  }
}

export async function deleteCommentAction(commentId: string, postId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("forum_comments")
    .delete()
    .eq("id", commentId)
    .eq("author_id", user.id);

  revalidatePath(`/community/${postId}`);
  revalidatePath(productPath(postId));
  revalidatePath("/products/mine");
}
