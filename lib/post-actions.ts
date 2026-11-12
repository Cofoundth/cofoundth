"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { getAccountRole } from "@/lib/account";
import { canComment, canPostProduct, canPostThread } from "@/lib/roles";
import { getFeedPosts, searchPosts } from "@/lib/posts";
import { getBlockedIds, isBlockedEitherWay } from "@/lib/blocking";
import { webUrl } from "@/lib/web-url";
import {
  MAX_POST_IMAGE_BYTES,
  MAX_PRODUCT_BLURB,
  MAX_PRODUCT_NAME,
  MAX_PRODUCT_IMAGES,
  PRODUCT_CATEGORIES,
  productPlatformsOf,
} from "@/lib/post-types";
import type { PostComment, PostItem } from "@/lib/post-types";

export type PostFormState = { error?: string } | null;

// What the COMMUNITY composer may write. A product (kind 'show_and_tell') is
// not one of them: products are added quietly through createProductAction
// below, from /products/new, and never announced in the feed (CLAUDE.md,
// Language Rules). Refusing the kind here is what makes that the only door —
// the composer no longer offers it, but a server action is invocable with any
// FormData at all.
const KINDS = ["post", "milestone"];

/** The write-side link test every post and product has had. A product's link
 *  must ALSO pass webUrl() (lib/web-url.ts), the parse every href built from
 *  link_url goes through on read, so no product row can carry a link the
 *  shelf would then silently drop. */
const HTTP_LINK = /^https?:\/\/.+/;

function revalidateFeeds(postId?: string) {
  revalidatePath("/community");
  // A show_and_tell post is also a row on the maker shelf, so deleting one
  // (deletePostAction) or moderating one has to drop the cache of both URLs
  // that can render the shelf.
  revalidatePath("/products");
  revalidatePath("/");
  if (postId) revalidatePath(`/community/${postId}`);
}

function parseTags(raw: string): string[] | { error: string } {
  const tags = Array.from(
    new Set(
      raw
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter(Boolean),
    ),
  ).slice(0, 5);
  for (const tag of tags) {
    // Letters + marks (Thai tone/vowel signs are \p{M}) + digits, hyphen-sep.
    if (!/^[\p{L}\p{N}\p{M}]+(-[\p{L}\p{N}\p{M}]+)*$/u.test(tag) || tag.length > 30) {
      return {
        error: `Bad tag "${tag}" — letters, digits, and hyphens only.`,
      };
    }
  }
  return tags;
}

// Keyed by the same four types as POST_IMAGE_TYPES in lib/post-types.ts, which
// the pickers build their `accept` and their early type check from.
const IMG_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMG_BYTES = MAX_POST_IMAGE_BYTES;

// The two per-file rules, pulled out of uploadPostImage so a batch can check
// every file BEFORE uploading any of them. Same checks, same order, same
// strings — uploadPostImage still runs them itself, so it stays safe to call
// on its own and the single-image path behaves exactly as it did.
function imageFileError(file: File): string | null {
  if (!IMG_EXT[file.type]) return "Please upload a JPG, PNG, WebP, or GIF.";
  if (file.size > MAX_IMG_BYTES) return "Max image size is 5MB.";
  return null;
}

async function uploadPostImage(
  userId: string,
  file: File,
): Promise<{ url?: string; path?: string; error?: string }> {
  const bad = imageFileError(file);
  if (bad) return { error: bad };
  const admin = createAdminClient();
  // Date.now() alone is not unique when five screenshots upload in PARALLEL:
  // same millisecond + same extension = the same key, and `upsert: false`
  // turns that into a failed upload of a perfectly good file. Hence the suffix.
  const path = `${userId}/post-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${IMG_EXT[file.type]}`;
  const bytes = Buffer.from(await file.arrayBuffer());
  const { error } = await admin.storage
    .from("post-images")
    .upload(path, bytes, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type,
    });
  if (error) return { error: error.message };
  return {
    path,
    url: admin.storage.from("post-images").getPublicUrl(path).data.publicUrl,
  };
}

// Best-effort: drop objects that uploaded before a sibling failed. Without it
// a member who retries three times leaves two orphan sets in the bucket that
// no row references and nothing will ever clean up.
async function removePostImages(uploads: { path?: string }[]) {
  const paths = uploads
    .map((u) => u.path)
    .filter((p): p is string => typeof p === "string");
  if (!paths.length) return;
  const { error } = await createAdminClient()
    .storage.from("post-images")
    .remove(paths);
  if (error) console.error("[post.create] orphaned images", paths, error.message);
}

/** Every image in the form under `name`, as a list, empty entries dropped. */
function filesIn(formData: FormData, name: string): File[] {
  return formData
    .getAll(name)
    .filter((e): e is File => e instanceof File && e.size > 0);
}

/**
 * Validate ALL of them, then upload all of them, or none. Shared by the two
 * writers below: a post's one cover and a product's screenshots go through the
 * same checks, the same bucket and the same orphan cleanup.
 *
 * Validating before uploading ANY is what keeps a 6MB fourth file from leaving
 * three objects in the bucket and no row — and a size or type rejection still
 * reads as the same plain sentence it always did. On success the caller owns
 * the uploads: if its insert then fails it must removePostImages() them.
 */
async function uploadAll(
  userId: string,
  files: File[],
  tag: string,
): Promise<
  | { uploads: { url?: string; path?: string }[]; error?: undefined }
  | { error: string; uploads?: undefined }
> {
  for (const file of files) {
    const bad = imageFileError(file);
    if (bad) return { error: bad };
  }

  const uploads = await Promise.all(
    files.map((file) => uploadPostImage(userId, file)),
  );
  const failed = uploads.findIndex((u) => !u.url);
  if (failed >= 0) {
    console.error(
      `[${tag}] image ${failed + 1} of ${uploads.length} failed:`,
      uploads[failed].error,
    );
    await removePostImages(uploads);
    // One file: the storage error itself, exactly as before. Several: say that
    // NOTHING was posted, because the alternative is a product quietly going
    // up with two of its five screenshots and the member never knowing which.
    return uploads.length === 1
      ? { error: uploads[0].error ?? "Couldn't upload the image. Try again." }
      : {
          error:
            "Couldn't upload all the images. Nothing was posted — try again.",
        };
  }
  return { uploads };
}

/**
 * A post or a milestone, from the community composer (components/
 * PostComposer.tsx). NOT a product: kind 'show_and_tell' is refused below, and
 * createProductAction is the only way one is written.
 */
export async function createPostAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const content = String(formData.get("content") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "post");
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();

  if (!content) return { error: "Say something." };
  if (content.length > 5000)
    return { error: "Keep it under 5000 characters." };
  if (title.length > 200) return { error: "Title must be 200 chars or less." };
  if (!KINDS.includes(kind)) return { error: "Bad kind." };
  if (linkUrl && !HTTP_LINK.test(linkUrl))
    return { error: "Link must start with http:// or https://" };

  const parsed = parseTags(tagsRaw);
  if (!Array.isArray(parsed)) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // Resolved from the ROLE, not from "is not an investor": an explorer answers
  // false to that negation and would inherit the whole founder ladder. An
  // explorer CAN comment (createPostCommentAction below) — that is the role,
  // not an oversight — so the refusal has to say which door is shut.
  const role = await getAccountRole(supabase, user.id);
  if (!canPostThread(role)) {
    if (role === "explorer")
      return {
        error:
          "Explorer accounts read and comment here — they don’t start threads.",
      };
    return { error: "Only founders can post in the community." };
  }

  // A post or a milestone carries one cover, sent as `image`.
  const files = filesIn(formData, "image").slice(0, 1);
  const uploaded = await uploadAll(user.id, files, "post.create");
  if (uploaded.error !== undefined) return { error: uploaded.error };
  const imageUrls = uploaded.uploads.map((u) => u.url as string);

  // `image_urls` is deliberately NOT written: it is the products' column, and
  // keeping the key off this insert is what keeps 'post' and 'milestone'
  // byte-identical to what they always were.
  const { error } = await supabase.from("forum_posts").insert({
    author_id: user.id,
    content,
    title: title || null,
    kind,
    link_url: linkUrl || null,
    image_url: imageUrls[0] ?? null,
    tags: parsed,
  });

  if (error) {
    console.error("[post.create]", error);
    await removePostImages(uploaded.uploads);
    return { error: "Couldn't post. Try again." };
  }

  revalidateFeeds();
  return null;
}

/**
 * A PRODUCT, from /products/new (app/(app)/products/new). The ONE writer of a
 * kind='show_and_tell' row — the community composer cannot make one any more.
 *
 * QUIET BY DESIGN (CLAUDE.md, Language Rules): the row is the same forum_posts
 * row a Show & tell always was, and it appears on the deck and on its own page,
 * and nowhere it would be announced — the community feed, its search and the
 * landing's "Happening now" all exclude the kind (lib/posts.ts,
 * app/(marketing)/(home)/PitchLanding.tsx). A maker who wants to announce it
 * writes a normal post.
 *
 * Every check the composer's product path had, in the same words, so the Thai
 * that already exists for each one keeps rendering: the name and description
 * caps, a required link that is http(s) by the old test AND by webUrl(), one
 * category from PRODUCT_CATEGORIES, canPostProduct, at most MAX_PRODUCT_IMAGES
 * screenshots, each one's type and size, and the all-or-nothing upload.
 *
 * On success it REDIRECTS to the product's member page with `?added=1`, which
 * shows the maker a short confirmation and the way to the deck. It does not
 * return, so the form never renders a stale success state.
 */
export async function createProductAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  // Tighter than a post: the deck card is where a description is read (and
  // clamps it) and the name is a label, not prose — see MAX_PRODUCT_NAME.
  if (!title) return { error: "Name your product." };
  if (title.length > MAX_PRODUCT_NAME)
    return { error: "Keep the product name short." };
  if (!content) return { error: "Say what it is." };
  if (content.length > MAX_PRODUCT_BLURB)
    return { error: "Keep the description short." };
  // A product is the one row that has to be actionable — the deck exists to
  // send someone to the real thing — so the link is required, and it has to
  // survive the same parse the shelf runs before it will show a card at all.
  if (!linkUrl) return { error: "Add a link so people can try it." };
  if (!HTTP_LINK.test(linkUrl) || !webUrl(linkUrl))
    return { error: "Link must start with http:// or https://" };
  // Stored as the row's ONE tag (lib/post-types.ts says why a tag and not a
  // column). NOT a message that lists the slugs: the English string IS the
  // dictionary key (lib/i18n.ts), so enumerating them would change the key
  // every time the taxonomy did and silently drop its Thai.
  if (!(PRODUCT_CATEGORIES as readonly string[]).includes(category))
    return { error: "Pick a category." };
  // "Runs on" (0080): one or more of PRODUCT_PLATFORMS, as repeated
  // `platforms` entries. productPlatformsOf drops anything unknown and
  // de-duplicates, so what is written always passes the column's check.
  // Required: it is what lets the deck send a computer a code to scan instead
  // of a store page (app/(marketing)/products/PhoneHandoff.tsx).
  const platforms = productPlatformsOf(
    formData.getAll("platforms").map((v) => String(v)),
  );
  if (!platforms.length) return { error: "Pick where it runs." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // The ladder's `product` cell (lib/roles.ts). The page refuses an explorer
  // too, and proxy.ts bounces an investor off the route, but a server action is
  // invocable without ever rendering its page, so the write checks for itself.
  const role = await getAccountRole(supabase, user.id);
  if (!canPostProduct(role)) {
    if (role === "explorer")
      return {
        error:
          "The shelf is for members who build. Switch to building to post a product.",
      };
    return { error: "Only founders can add products." };
  }

  const files = filesIn(formData, "images");
  if (files.length > MAX_PRODUCT_IMAGES)
    return { error: `Up to ${MAX_PRODUCT_IMAGES} images per product.` };
  const uploaded = await uploadAll(user.id, files, "product.create");
  if (uploaded.error !== undefined) return { error: uploaded.error };
  const imageUrls = uploaded.uploads.map((u) => u.url as string);

  const { data: row, error } = await supabase
    .from("forum_posts")
    .insert({
      author_id: user.id,
      content,
      title,
      kind: "show_and_tell",
      link_url: linkUrl,
      // The first screenshot ALSO goes in the legacy single column, so
      // everything that still reads `image_url` on its own keeps a cover (the
      // /p/[id] OG image among them). Every renderer goes through postImages().
      image_url: imageUrls[0] ?? null,
      // Only written when there are screenshots: a product without any keeps
      // the column's own default, exactly as the composer's product path did.
      ...(imageUrls.length ? { image_urls: imageUrls } : {}),
      tags: [category],
      platforms,
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[product.create]", error);
    await removePostImages(uploaded.uploads);
    return { error: "Couldn't add your product. Try again." };
  }

  const id = row.id as string;
  // The shelf (/products, and / once it serves the shelf) and the product's own
  // two pages. NOT the feeds: the product is not in them.
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath(`/p/${id}`);
  revalidatePath(`/community/${id}`);

  // OUTSIDE any try: redirect() throws to do its job. The member page, not
  // /p/<id>: /p/<id> redirects a signed-in member there anyway, and rebuilds
  // only the deck context on the way, which would drop `added`.
  redirect(`/community/${encodeURIComponent(id)}?added=1`);
}

// Full-DB search (title / content / tags / author) — beyond the loaded page.
export async function searchFeedAction(q: string): Promise<PostItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return searchPosts(supabase, q, user?.id ?? null);
}

// Cursor pagination: next page of the feed, older than `before` (created_at).
// Same block exclusion the first page applies — without it a blocked author
// reappears on page 2, which is worse than never having filtered at all.
export async function loadMoreFeedAction(before: string): Promise<PostItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const blocked = user ? await getBlockedIds(user.id) : undefined;
  return getFeedPosts(supabase, {
    limit: 20,
    userId: user?.id ?? null,
    before,
    excludeAuthorIds: blocked,
  });
}

export async function deletePostAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from("forum_posts")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);
  revalidateFeeds(id);
}

// NO role gate, and that is the ladder, not an omission: EVERY role may like
// (lib/roles.ts canLike is true for all three). The self-scoped deletes above
// and below, and reportContentAction, are open to every role for the same
// reason — they act only on the caller's own row, or on the moderation queue
// that everyone can reach. Do not "add the missing check".
export async function togglePostLikeAction(postId: string) {
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
  revalidateFeeds(postId);
}

export async function createPostCommentAction(
  postId: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return { error: "Comment can't be empty." };
  if (content.length > 2000)
    return { error: "Comment too long (max 2000 chars)." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // AN EXPLORER IS DELIBERATELY ALLOWED THROUGH HERE, and is deliberately
  // refused at createPostAction above. Feedback is the entire value the
  // explorer role brings, so commenting is the one write it has. Anyone
  // "tidying" these two gates onto the same predicate is deleting the reason
  // the role exists, not closing a hole. Investors stay read-only.
  const role = await getAccountRole(supabase, user.id);
  if (!canComment(role))
    return { error: "Investor accounts don’t comment in the community." };

  // A blocked pair can't talk here either. The post itself already 404s for
  // this viewer (/community/[id]), so this closes the direct-action path that
  // skips the page — and it deliberately doesn't say who blocked whom.
  const { data: post } = await supabase
    .from("forum_posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { error: "This post isn’t available." };
  if (await isBlockedEitherWay(user.id, post.author_id as string)) {
    return { error: "This post isn’t available." };
  }

  const { error } = await supabase
    .from("forum_comments")
    .insert({ post_id: postId, author_id: user.id, content });

  if (error) {
    console.error("[comment.create]", error);
    return { error: "Couldn't post comment. Try again." };
  }
  void notifyMentions(postId, user.id, content);
  revalidateFeeds(postId);
  return null;
}

// Notify @mentioned thread participants (post author + other commenters),
// matched by first name. The post author is skipped — the comment trigger
// already notifies them. Notifications are insert-locked by RLS, so we use
// the service-role client. Best-effort; never blocks the comment.
async function notifyMentions(
  postId: string,
  commenterId: string,
  content: string,
) {
  try {
    const handles = Array.from(
      content.matchAll(/(?:^|[^\p{L}\p{N}\p{M}_/])@([\p{L}\p{N}\p{M}]+)/gu),
    ).map((m) => m[1].toLowerCase());
    if (!handles.length) return;

    const admin = createAdminClient();
    const [{ data: post }, { data: commenters }] = await Promise.all([
      admin.from("forum_posts").select("author_id, title").eq("id", postId).single(),
      admin.from("forum_comments").select("author_id").eq("post_id", postId),
    ]);

    const ids = new Set<string>();
    if (post?.author_id) ids.add(post.author_id as string);
    (commenters ?? []).forEach((c) => ids.add(c.author_id as string));
    ids.delete(commenterId);
    if (post?.author_id) ids.delete(post.author_id as string); // covered by comment trigger
    if (!ids.size) return;

    const { data: profs } = await admin
      .from("profiles")
      .select("id, full_name")
      .in("id", [...ids]);

    const recipients = (profs ?? []).filter((p) => {
      const first = (p.full_name as string | null)?.trim().split(/\s+/)[0]?.toLowerCase();
      return first && handles.includes(first);
    });
    if (!recipients.length) return;

    const { data: me } = await admin
      .from("profiles")
      .select("full_name")
      .eq("id", commenterId)
      .single();

    await admin.from("notifications").insert(
      recipients.map((r) => ({
        recipient_id: r.id as string,
        actor_id: commenterId,
        type: "mention",
        entity_id: postId,
        data: {
          actor_name: (me?.full_name as string) ?? "Someone",
          post_title: (post?.title as string) ?? "",
        },
      })),
    );
  } catch (e) {
    console.error("[notifyMentions] failed", e);
  }
}

export async function deletePostCommentAction(
  commentId: string,
  postId: string,
) {
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
  revalidateFeeds(postId);
}

// ---- Reporting + moderation -----------------------------------------

// Flag a post or comment. Anyone (not the author) can report; lands in
// /admin/reports. RLS (reports_insert_self) requires reporter_id = auth.uid().
export async function reportContentAction(
  kind: "post" | "comment",
  targetId: string,
  reason: string,
): Promise<{ ok?: boolean; error?: string }> {
  const r = reason.trim();
  if (kind !== "post" && kind !== "comment") return { error: "Bad target." };
  if (r.length < 5) return { error: "Add a few words on why." };
  if (r.length > 1000) return { error: "Reason is too long." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase
    .from("reports")
    .insert({ reporter_id: user.id, target_kind: kind, target_id: targetId, reason: r });
  if (error) {
    console.error("[reportContent]", error);
    return { error: "Couldn't submit the report. Try again." };
  }
  return { ok: true };
}

// Admin-only: act on a report. "remove" deletes the offending content (post /
// comment / message) and resolves; "resolve" closes it without deleting;
// "dismiss" marks it dismissed.
export async function moderateReportAction(
  reportId: string,
  decision: "remove" | "resolve" | "dismiss",
): Promise<{ ok?: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) return { error: "Not allowed." };

  const admin = createAdminClient();
  const { data: report } = await admin
    .from("reports")
    .select("target_kind, target_id")
    .eq("id", reportId)
    .single();
  if (!report) return { error: "Report not found." };

  if (decision === "remove") {
    const table =
      report.target_kind === "post"
        ? "forum_posts"
        : report.target_kind === "comment"
          ? "forum_comments"
          : report.target_kind === "message"
            ? "messages"
            : null; // never auto-delete a profile from a report
    if (table) await admin.from(table).delete().eq("id", report.target_id);
  }

  await admin
    .from("reports")
    .update({
      status: decision === "dismiss" ? "dismissed" : "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  revalidatePath("/admin/reports");
  revalidateFeeds();
  return { ok: true };
}

export async function fetchPostCommentsAction(
  postId: string,
): Promise<PostComment[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: comments } = await supabase
    .from("forum_comments")
    .select("id, author_id, content, created_at")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });

  if (!comments?.length) return [];

  const authorIds = Array.from(
    new Set(comments.map((c) => c.author_id as string)),
  );
  const { data: authors } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, slug")
    .in("id", authorIds);
  const am = new Map((authors ?? []).map((a) => [a.id as string, a]));

  return comments.map((c) => {
    const a = am.get(c.author_id as string);
    return {
      id: c.id as string,
      content: c.content as string,
      created_at: c.created_at as string,
      author: a
        ? {
            id: a.id as string,
            full_name: (a.full_name as string | null) ?? null,
            photo_url: (a.photo_url as string | null) ?? null,
            slug: (a.slug as string | null) ?? null,
          }
        : null,
      isOwn: !!user && c.author_id === user.id,
    };
  });
}
