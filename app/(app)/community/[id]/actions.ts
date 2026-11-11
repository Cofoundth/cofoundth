"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account";
import { isBlockedEitherWay } from "@/lib/blocking";
import { isRatingScore } from "@/lib/post-types";
import { canComment, canRate } from "@/lib/roles";

export type CommentState = { error?: string } | null;

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

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Every path a product's rating is shown on. `/` and `/products` render the
 *  shelf; /p/<id> is the public page and /community/<id> the member one. */
function revalidateProduct(postId: string) {
  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/p/${postId}`);
  revalidatePath(`/community/${postId}`);
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

export async function createCommentAction(
  postId: string,
  _prev: CommentState,
  formData: FormData,
): Promise<CommentState> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Comment can't be empty." };
  if (content.length > 2000)
    return { error: "Comment too long (max 2000 chars)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // AN EXPLORER IS DELIBERATELY ALLOWED HERE. This is the thread-detail twin of
  // lib/post-actions.ts createPostCommentAction, and commenting is the explorer
  // role's whole point — narrowing it to founders would remove a feature, not
  // close a hole. Only investors are read-only in the community.
  const role = await getAccountRole(supabase, user.id);
  if (!canComment(role))
    return { error: "Investor accounts don’t comment in the community." };

  const { error } = await supabase
    .from("forum_comments")
    .insert({ post_id: postId, author_id: user.id, content });

  if (error) {
    console.error("[forum_comments.insert]", error);
    return { error: "Couldn't post comment. Try again." };
  }

  revalidatePath(`/community/${postId}`);
  revalidatePath(`/community`);
  return null;
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
}
