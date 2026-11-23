"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { getAccountRole } from "@/lib/account";
import {
  canComment,
  canPostProduct,
  canPostThread,
  LIKED_PRODUCTS_PATH,
  MY_PRODUCTS_PATH,
} from "@/lib/roles";
import { getFeedPosts, searchPosts } from "@/lib/posts";
import { getBlockedIds, isBlockedEitherWay } from "@/lib/blocking";
import { countComments, readCommentBatch, type ThreadComment } from "@/lib/comment-thread";
import { webUrl } from "@/lib/web-url";
import {
  LIKE_BEFORE_COMMENTING,
  MAX_PRODUCT_BLURB,
  MAX_PRODUCT_NAME,
  MAX_PRODUCT_IMAGES,
  MIN_PRODUCT_IMAGES,
  PRODUCT_CATEGORIES,
  isMobileProductPlatform,
  postImages,
  productPlatformsOf,
} from "@/lib/post-types";
import { filesIn, removePostImages, uploadAll } from "@/lib/post-image-upload";
import { readProductForEdit } from "@/lib/product-edit-access";
import { validateProductLinks } from "@/lib/product-store-links";
import { readProductLike } from "@/lib/product-likes";
import { queryWithProductStoreColumns } from "@/lib/product-store-data";
import { hasTriedProduct, TRY_BEFORE_COMMENTING } from "@/lib/product-tries";
import { getPublicPost, PRODUCT_KIND } from "@/lib/public-post";
import { productPath, type PostItem } from "@/lib/post-types";
import {
  cleanUpDeletedPost,
  DELETED_POST_COLUMNS,
  removeOwnImages,
  type DeletedPost,
} from "@/lib/post-cleanup";
import {
  isRateLimited,
  LINK_TOO_LONG,
  MAX_LINK_LENGTH,
  RATE_LIMITED,
} from "@/lib/write-limits";

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
  revalidatePath(LIKED_PRODUCTS_PATH);
  revalidatePath("/");
  if (postId) {
    revalidatePath(`/community/${postId}`);
    // The id may be a product's, whose page is /products/<id>. A comment or a
    // like on one comes through here too.
    revalidatePath(productPath(postId));
  }
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
  if (linkUrl.length > MAX_LINK_LENGTH) return { error: LINK_TOO_LONG };
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
  const uploaded = await uploadAll(
    user.id,
    files,
    "post.create",
    "Couldn't upload all the images. Nothing was posted — try again.",
  );
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
    return {
      error: isRateLimited(error) ? RATE_LIMITED.post : "Couldn't post. Try again.",
    };
  }

  revalidateFeeds();
  return null;
}

/**
 * A PRODUCT, from /products/new (app/(app)/products/new). The ONE writer of a
 * kind='show_and_tell' row — the community composer cannot make one any more.
 *
 * The listing write also creates its dedicated product record in the same
 * transaction (0092). The listing owns the comments and likes. It appears on
 * the deck and on its own page,
 * and nowhere it would be announced — the community feed and its search
 * exclude the kind (lib/posts.ts). A maker who wants to announce it writes a
 * normal post.
 *
 * Every check the composer's product path had, in the same words, so the Thai
 * that already exists for each one keeps rendering: the name and description
 * caps, a required link that is http(s) by the old test AND by webUrl(), one
 * category from PRODUCT_CATEGORIES, canPostProduct, at most MAX_PRODUCT_IMAGES
 * screenshots, each one's type and size, and the all-or-nothing upload.
 *
 * On success it REDIRECTS to the product's page (/products/<id>) with
 * `?added=1`, which shows the maker a short confirmation and the way to the
 * deck. It does not return, so the form never renders a stale success state.
 */
type ProductFields = {
  title: string;
  content: string;
  linkUrl: string;
  iosStoreUrl: string | null;
  androidStoreUrl: string | null;
  category: string;
  platforms: string[];
};

/**
 * A product's fields out of the form, with every rule a product has — the one
 * set of checks for adding one (createProductAction) and editing one
 * (updateProductAction), so an edit can never write a row that adding it
 * would have refused.
 */
function productFields(formData: FormData): ProductFields | { error: string } {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim();

  // Tighter than a post: the deck card is where a description is read (and
  // clamps it) and the name is a label, not prose — see MAX_PRODUCT_NAME.
  if (!title) return { error: "Name your product." };
  if (title.length > MAX_PRODUCT_NAME)
    return { error: "Keep the product name short." };
  if (!content) return { error: "Say what it is." };
  if (content.length > MAX_PRODUCT_BLURB)
    return { error: "Keep the description short." };
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
  const inStores = formData.get("in_stores") === "on";
  if (inStores && !platforms.some(isMobileProductPlatform))
    return { error: "Select Mobile to add app store links." };
  const links = validateProductLinks({
    link: String(formData.get("link_url") ?? ""),
    requiresTryLink: platforms.some((platform) => !isMobileProductPlatform(platform)),
    inStores,
    ios: String(formData.get("ios_store_url") ?? ""),
    android: String(formData.get("android_store_url") ?? ""),
  });
  if (links.error !== undefined) return { error: links.error };

  return { title, content, category, platforms, ...links };
}

export async function createProductAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const fields = productFields(formData);
  if ("error" in fields) return fields;
  const { title, content, linkUrl, iosStoreUrl, androidStoreUrl, category, platforms } = fields;

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
  if (files.length < MIN_PRODUCT_IMAGES)
    return { error: `Add at least ${MIN_PRODUCT_IMAGES} screenshots.` };
  const uploaded = await uploadAll(
    user.id,
    files,
    "product.create",
    "Couldn't upload all the images. Nothing was added — try again.",
  );
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
      ...(iosStoreUrl && { ios_store_url: iosStoreUrl }),
      ...(androidStoreUrl && { android_store_url: androidStoreUrl }),
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
    return {
      error: isRateLimited(error)
        ? RATE_LIMITED.product
        : "Couldn't add your product. Try again.",
    };
  }

  const id = row.id as string;
  // The shelf (/products, and / once it serves the shelf), the product's own
  // page and My products. NOT the feeds: the product is not in them.
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath(productPath(id));
  revalidatePath(MY_PRODUCTS_PATH);

  // OUTSIDE any try: redirect() throws to do its job.
  redirect(`${productPath(id)}?added=1`);
}

/** A forum_posts id as Postgres stores it. Checked before any read, so a
 *  malformed id is a plain refusal rather than a 22P02 from PostgREST. */
const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The refusal for a product this member cannot edit or delete: not theirs,
 *  not a product, or gone. One sentence for all three on purpose — it says
 *  nothing about whose it is. */
const PRODUCT_UNAVAILABLE = "This product isn’t available.";

/**
 * The maker's own product row, through their own client, or null. The checks
 * every write to a product repeats: it exists, it IS a product, it is theirs.
 */
async function ownProduct(
  supabase: Awaited<ReturnType<typeof createClient>>,
  productId: string,
  userId: string,
) {
  if (typeof productId !== "string" || !UUID.test(productId)) return null;
  const { data } = await supabase
    .from("forum_posts")
    .select("id, author_id, kind, image_url, image_urls")
    .eq("id", productId)
    .maybeSingle();
  if (!data || data.kind !== "show_and_tell" || data.author_id !== userId)
    return null;
  return {
    id: data.id as string,
    images: postImages({
      image_url: (data.image_url as string | null) ?? null,
      image_urls: (data.image_urls as string[] | null) ?? null,
    }),
  };
}

/** Every page a product's contents show on. */
function revalidateProduct(productId: string) {
  revalidatePath("/products");
  revalidatePath("/");
  revalidatePath(productPath(productId));
  revalidatePath(MY_PRODUCTS_PATH);
  revalidatePath(LIKED_PRODUCTS_PATH);
}

/**
 * EDIT a product, from /products/<id>/edit (app/(app)/products/[id]/edit).
 * Makers edit their own listings. Admins can edit any curated listing. The
 * action rechecks access independently of the edit page.
 *
 * WHAT IT NEVER TOUCHES: `kind` (a product stays a product — migration 0081
 * refuses the change at the database too), `hidden` (moderation; 0078),
 * `author_id`, the ratings, the comments and the likes. Editing is quiet, like
 * adding: nothing is posted anywhere.
 *
 * SCREENSHOTS. The form sends the ones the maker kept as `keep` (in strip
 * order) and the new files as `images`. A `keep` URL survives only if the
 * product really has it — anything else is dropped, so this cannot be used to
 * point a product at someone else's image. The new files go through the same
 * checks and the same all-or-nothing upload as adding; the result is the kept
 * ones followed by the new ones, the first being the cover. Screenshots the
 * product no longer uses are removed from storage afterwards, best-effort.
 *
 * On success it REDIRECTS to the product's page with `?saved=1`.
 */
export async function updateProductAction(
  productId: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const fields = productFields(formData);
  if ("error" in fields) return fields;
  const { title, content, linkUrl, iosStoreUrl, androidStoreUrl, category, platforms } = fields;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const role = await getAccountRole(supabase, user.id);
  const target = await readProductForEdit(supabase, user, productId, canPostProduct(role));
  if (!target) return { error: PRODUCT_UNAVAILABLE };
  const { post, client } = target;
  const oldImages = postImages(post);

  const kept = Array.from(
    new Set(formData.getAll("keep").map((v) => String(v))),
  ).filter((url) => oldImages.includes(url));
  const files = filesIn(formData, "images");
  if (kept.length + files.length > MAX_PRODUCT_IMAGES)
    return { error: `Up to ${MAX_PRODUCT_IMAGES} images per product.` };
  // An edit cannot leave fewer than the minimum, including on a product saved
  // before the rule (the founder's call: they keep theirs until edited).
  if (!post.is_curated && kept.length + files.length < MIN_PRODUCT_IMAGES)
    return { error: `Add at least ${MIN_PRODUCT_IMAGES} screenshots.` };
  const uploaded = await uploadAll(
    user.id,
    files,
    "product.update",
    "Couldn't upload all the images. Nothing was changed — try again.",
  );
  if (uploaded.error !== undefined) return { error: uploaded.error };
  const imageUrls = [...kept, ...uploaded.uploads.map((u) => u.url as string)];

  // The listing trigger saves the product's availability in the same write.
  const { data: updated, error } = await queryWithProductStoreColumns(
    (includeStores) => client
      .from("forum_posts")
      .update({
        title,
        content,
        link_url: linkUrl,
        ...(includeStores && { ios_store_url: iosStoreUrl, android_store_url: androidStoreUrl }),
        tags: [category],
        platforms,
        // Keep the first screenshot in the legacy cover column as well.
        image_url: imageUrls[0] ?? null,
        image_urls: imageUrls,
      })
      .eq("id", post.id)
      .eq("author_id", post.author_id)
      .eq("kind", PRODUCT_KIND)
      .select("id"),
    !iosStoreUrl && !androidStoreUrl && !platforms.includes("mobile"),
  );

  if (error || !updated?.length) {
    console.error("[product.update]", error);
    await removePostImages(uploaded.uploads);
    return { error: "Couldn’t save your changes. Try again." };
  }

  // Screenshots the edit dropped (lib/post-cleanup.ts: the maker's own folder
  // only, best-effort).
  // Curated screenshot URLs can be reused across listings.
  if (!post.is_curated) {
    await removeOwnImages(
      user.id,
      oldImages.filter((url) => !imageUrls.includes(url)),
      "product.images",
    );
  } else {
    revalidatePath("/admin/products");
    revalidatePath("/admin/posts");
  }
  revalidateProduct(post.id);

  // OUTSIDE any try: redirect() throws to do its job.
  redirect(`${productPath(post.id)}?saved=1`);
}

/**
 * DELETE a product, from My products (app/(app)/products/mine). Its maker
 * only, and only a product, re-checked here like updateProductAction. Its
 * ratings, comments and likes go with it (ON DELETE CASCADE on
 * product_ratings, forum_comments and forum_likes); the comment and mention
 * notifications that point at it are removed too, since they would only open
 * a 404; its screenshots are removed from storage, best-effort. Reports about
 * it stay: they are the moderators' record.
 *
 * Returns an error to show, or null. The list re-renders without it.
 */
export async function deleteProductAction(
  productId: string,
): Promise<{ error?: string } | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const product = await ownProduct(supabase, productId, user.id);
  if (!product) return { error: PRODUCT_UNAVAILABLE };

  // `.select()` for the same reason as the edit: zero rows is a failure. And
  // what it returns is the row AS DELETED, which is what the cleanup works
  // from (lib/post-cleanup.ts): the notifications and the screenshots.
  const { data: gone, error } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", product.id)
    .eq("author_id", user.id)
    .select(DELETED_POST_COLUMNS);
  if (error || !gone?.length) {
    console.error("[product.delete]", error);
    return { error: "Couldn’t delete it. Try again." };
  }
  await cleanUpDeletedPost(gone[0] as unknown as DeletedPost, "product.delete");

  revalidateProduct(product.id);
  return null;
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

// A member deleting their own post. The row's image and the notifications that
// point at it go too (lib/post-cleanup.ts) — the same cleanup deleting a
// product does, and an admin removal does. `.select()` returns the row only if
// THIS delete removed it, which is the one signal safe to clean up after.
export async function deletePostAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const { data: gone } = await supabase
    .from("forum_posts")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id)
    .select(DELETED_POST_COLUMNS);
  if (gone?.length)
    await cleanUpDeletedPost(gone[0] as unknown as DeletedPost, "post.delete");
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

/** Records opening the product link or confirming a try after a phone handoff. */
export async function recordProductTryAction(productId: string): Promise<boolean> {
  if (typeof productId !== "string" || !UUID.test(productId)) return false;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !canComment(await getAccountRole(supabase, user.id))) return false;

  const found = await getPublicPost(productId);
  if (!found || found.post.kind !== PRODUCT_KIND || !webUrl(found.post.link_url)) return false;
  if (await isBlockedEitherWay(user.id, found.post.author_id)) return false;
  if (found.post.author_id === user.id) return true;

  const { error } = await createAdminClient().from("product_tries").upsert(
    { product_id: productId, user_id: user.id },
    { onConflict: "user_id,product_id", ignoreDuplicates: true },
  );
  if (error) console.error("[product.try]", error);
  return !error;
}

export async function createPostCommentAction(
  postId: string,
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const content = String(formData.get("content") ?? "").trim();
  const parentId = formData.get("parent_comment_id");
  if (!content) return { error: "Comment can't be empty." };
  if (content.length > 2000)
    return { error: "Comment too long (max 2000 chars)." };
  if (parentId !== null && (typeof parentId !== "string" || !UUID.test(parentId))) {
    return { error: "This comment is no longer available." };
  }

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
  //
  // The refusals name what the reader was looking at: this action also takes
  // comments on a PRODUCT (its page's composer, and the deck's review modal),
  // and a product is not a post. A row that is gone has no kind left to name.
  const { data: post } = await supabase
    .from("forum_posts")
    .select("author_id, kind")
    .eq("id", postId)
    .maybeSingle();
  if (!post) return { error: "This isn’t available any more." };
  if (await isBlockedEitherWay(user.id, post.author_id as string)) {
    return {
      error:
        post.kind === "show_and_tell"
          ? PRODUCT_UNAVAILABLE
          : "This post isn’t available.",
    };
  }

  if (post.kind === PRODUCT_KIND) {
    const { data: like, error } = await readProductLike(supabase, user.id, postId);
    if (error) {
      console.error("[comment.product_like]", error.message);
      return { error: "Couldn't post comment. Try again." };
    }
    if (!like) return { error: LIKE_BEFORE_COMMENTING };
    if (post.author_id !== user.id && !(await hasTriedProduct(supabase, user.id, postId))) {
      return { error: TRY_BEFORE_COMMENTING };
    }
  }

  let replyAuthorId: string | null = null;
  if (parentId) {
    const { data: parent } = await supabase
      .from("forum_comments")
      .select("author_id")
      .eq("id", parentId)
      .eq("post_id", postId)
      .maybeSingle();
    if (!parent || await isBlockedEitherWay(user.id, parent.author_id)) {
      return { error: "This comment is no longer available." };
    }
    replyAuthorId = parent.author_id;
  }

  const { error } = await supabase
    .from("forum_comments")
    .insert({
      post_id: postId,
      author_id: user.id,
      content,
      ...(parentId ? { parent_comment_id: parentId } : {}),
    });

  if (error) {
    if (parentId && error.code === "23503") {
      return { error: "This comment is no longer available." };
    }
    console.error("[comment.create]", error);
    return {
      error: isRateLimited(error)
        ? RATE_LIMITED.comment
        : "Couldn't post comment. Try again.",
    };
  }
  void notifyMentions(postId, user.id, content, replyAuthorId);
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
  replyAuthorId: string | null,
) {
  try {
    const handles = Array.from(
      content.matchAll(/(?:^|[^\p{L}\p{N}\p{M}_/])@([\p{L}\p{N}\p{M}]+)/gu),
    ).map((m) => m[1].toLowerCase());
    if (!handles.length) return;

    const admin = createAdminClient();
    const [{ data: post }, { data: commenters }] = await Promise.all([
      admin
        .from("forum_posts")
        .select("author_id, title, kind")
        .eq("id", postId)
        .single(),
      admin.from("forum_comments").select("author_id").eq("post_id", postId),
    ]);

    const ids = new Set<string>();
    if (post?.author_id) ids.add(post.author_id as string);
    (commenters ?? []).forEach((c) => ids.add(c.author_id as string));
    ids.delete(commenterId);
    if (post?.author_id) ids.delete(post.author_id as string); // covered by comment trigger
    if (replyAuthorId) ids.delete(replyAuthorId); // covered by the reply notification
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
        // post_kind: so a mention on a product reads and links as one
        // (lib/notifications.ts). The comment trigger writes the same key.
        data: {
          actor_name: (me?.full_name as string) ?? "Someone",
          post_title: (post?.title as string) ?? "",
          post_kind: (post?.kind as string) ?? "post",
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
): Promise<PostFormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  const { error } = await supabase
    .from("forum_comments")
    .delete()
    .eq("id", commentId)
    .eq("post_id", postId)
    .eq("author_id", user.id);
  if (error) return { error: "Something went wrong. Try again." };
  revalidateFeeds(postId);
  revalidatePath(MY_PRODUCTS_PATH);
  return null;
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
// product / comment / message) and resolves; "resolve" closes it without
// deleting; "dismiss" marks it dismissed. A profile or a meetup is never
// deleted from a report — the reports page offers no "remove" for them.
//
// A removed post or product goes with its image(s) and the notifications that
// point at it (lib/post-cleanup.ts), exactly as when its author deletes it: a
// removal that left the reported picture public at its URL would not be one.
// A failed delete returns an error and leaves the report OPEN, so the queue
// never says "resolved" about something that is still up.
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

  // The page the removed thing showed on, to drop from the cache below.
  let onPostId: string | undefined;
  if (decision === "remove") {
    const targetId = report.target_id as string;
    if (report.target_kind === "post") {
      const { data: gone, error } = await admin
        .from("forum_posts")
        .delete()
        .eq("id", targetId)
        .select(DELETED_POST_COLUMNS);
      if (error) {
        console.error("[report.remove] post", error.message);
        return { error: "Couldn’t remove it. Try again." };
      }
      if (gone?.length)
        await cleanUpDeletedPost(gone[0] as unknown as DeletedPost, "report.remove");
      onPostId = targetId;
    } else if (report.target_kind === "comment") {
      const { data: gone, error } = await admin
        .from("forum_comments")
        .delete()
        .eq("id", targetId)
        .select("post_id");
      if (error) {
        console.error("[report.remove] comment", error.message);
        return { error: "Couldn’t remove it. Try again." };
      }
      onPostId = (gone?.[0]?.post_id as string | undefined) ?? undefined;
    } else if (report.target_kind === "message") {
      const { error } = await admin
        .from("messages")
        .delete()
        .eq("id", targetId);
      if (error) {
        console.error("[report.remove] message", error.message);
        return { error: "Couldn’t remove it. Try again." };
      }
    } else {
      return { error: "This kind of report can’t be removed from here." };
    }
    // Removed content leaves the pages it showed on NOW, before the status
    // write below, which can fail on its own: a post's page or a product's
    // (revalidateFeeds covers both, and the shelf), plus My products, whose
    // rows count comments.
    revalidateFeeds(onPostId);
    if (onPostId) revalidatePath(MY_PRODUCTS_PATH);
  }

  const { error: statusError } = await admin
    .from("reports")
    .update({
      status: decision === "dismiss" ? "dismissed" : "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  revalidatePath("/admin/reports");
  if (statusError) {
    // After a "remove" the content is already gone; the admin sees this and
    // can mark the report resolved again.
    console.error("[report.status]", statusError.message);
    return { error: "Couldn’t update the report. Try again." };
  }
  return { ok: true };
}

export async function fetchPostCommentsAction(
  postId: string,
): Promise<{ comments: ThreadComment[]; total: number | null; supportsReplies: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The newest batch and the count, under the same block rules as a post's
  // own thread (lib/comment-thread.ts): no comment by anyone the reader
  // blocked or who blocked them. This drawer used to load every comment and
  // skip that filter.
  // A failed read: no rows, and `total` null so the card keeps its count.
  const blocked = user ? await getBlockedIds(user.id) : new Set<string>();
  const read = await Promise.all([
    readCommentBatch(supabase, { postId, viewerId: user?.id ?? null, blocked }),
    countComments(supabase, postId, blocked),
  ]).catch((e) => {
    console.error("[comments.drawer]", e);
    return null;
  });
  if (!read) return { comments: [], total: null, supportsReplies: false };
  const [{ comments, supportsReplies }, total] = read;
  return { total, comments, supportsReplies };
}
