// The ONE gated read of a forum_posts row for a logged-out visitor, shared by
// the two public pages that show one: /p/<id> (a post or a milestone) and
// /products/<id> (a product). It lived inside /p/<id> until products got
// their own page; a second copy of a gate is exactly how the hole it closes
// first appeared (see below), so both pages import this one.
//
// ── SERVICE ROLE MEANS EVERY FILTER IS APPLICATION CODE ───────────────────
// `forum_posts`, `forum_comments` and `profiles` each have exactly ONE SELECT
// policy and it is `to authenticated`. `anon` has no read policy on any of
// them, so a public page cannot use the cookie-session client: it would get
// `[]` and HTTP 200, with no error, and render an empty post forever. It reads
// through createAdminClient() instead, which BYPASSES RLS — so every row
// filter that RLS would have applied is this function's job, and a filter
// forgotten here is a leak rather than a bug.
//
// Each page's body AND its generateMetadata go through getPublicPost(),
// because two separately-filtered queries are exactly how the hole appeared:
// the permalink used to filter on `id` alone in two places, so an admin-hidden
// post stayed fully readable at its URL AND kept emitting og:title /
// og:description / og:image. The same single-allowlist posture as
// lib/public-profile.ts, for the same reason.
//
// WHAT THE GATE FILTERS, and what each one costs if dropped:
//   · `hidden = false`  — moderation. Hiding a post already removes it from
//     the feed, from search and from /products (lib/posts.ts pins it in all
//     three); without this, hiding it did NOT remove it from its own public
//     URL, and /products + the sitemap advertise that URL.
//   · author not `suspended`, not `is_bot`, and an allowed `account_type` —
//     lib/public-author.ts isPubliclyAttributable(), which says why each one.
//   · NOT `profile_complete`: this is not the directory, it is a post that
//     exists, written by whoever wrote it.
// In DEVELOPMENT ONLY a product by one of the three suspended test accounts
// also passes the author half (lib/test-accounts.ts), so a test product has a
// page; nothing else widens.
//
// FAILS CLOSED. A read error returns null (a 404) rather than an unfiltered
// row: this is the only thing standing between a moderated post and the open
// internet, and the failure mode of "fail open" here is publishing exactly
// what an admin hid.

import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { isPubliclyAttributable } from "@/lib/public-author";
import { devTestAuthorIds } from "@/lib/test-accounts";
import { PRODUCT_STORE_COLUMNS, queryWithProductStoreColumns } from "@/lib/product-store-data";

// Named columns, never `select("*")`, on a table whose rows are about to be
// handed to anonymous traffic. `author_id` is read to resolve the author and
// never rendered; `hidden` is not selected because the gate filters on it
// rather than deciding in JS.
const PUBLIC_POST_COLUMNS =
  "id, author_id, title, content, kind, link_url, image_url, image_urls, tags, platforms, created_at";

// The author fields a public page may show, plus the three columns the gate
// reads. `email`, `age` and the rest of profiles stay out (the
// development-only test-account check reads the email inside
// lib/test-accounts.ts, never here).
export const PUBLIC_AUTHOR_COLUMNS =
  "full_name, photo_url, suspended, is_bot, account_type";

export type PublicPostRow = {
  id: string;
  author_id: string;
  title: string | null;
  content: string;
  kind: string | null;
  link_url: string | null;
  ios_store_url?: string | null;
  android_store_url?: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  tags: string[] | null;
  /** Where a product runs (0080). */
  platforms: string[] | null;
  created_at: string;
};

export type PublicAuthor = { full_name: string | null; photo_url: string | null };

/**
 * A post an anonymous visitor may read, with the author fields they may see,
 * or null. `cache()` so a page body and its generateMetadata share a single
 * round trip inside one request — and, more importantly, so they can never
 * disagree about whether a post is public.
 */
export const getPublicPost = cache(
  async (
    id: string,
  ): Promise<{ post: PublicPostRow; author: PublicAuthor } | null> => {
    const admin = createAdminClient();

    const { data: post, error } = await queryWithProductStoreColumns((includeStores) => {
      const table = admin.from("forum_posts");
      const query = includeStores
        ? table.select(`${PUBLIC_POST_COLUMNS}, ${PRODUCT_STORE_COLUMNS}`)
        : table.select(PUBLIC_POST_COLUMNS);
      return query.eq("id", id).eq("hidden", false).maybeSingle();
    });
    if (error || !post) return null;

    const { data: author, error: authorError } = await admin
      .from("profiles")
      .select(PUBLIC_AUTHOR_COLUMNS)
      .eq("id", (post as PublicPostRow).author_id)
      .maybeSingle();
    // A post with no readable author is not publishable: the author's
    // moderation flags and role are part of the gate, so "could not read them"
    // has to mean no.
    if (authorError || !author) return null;
    if (!isPubliclyAttributable(author)) {
      // DEVELOPMENT ONLY: a PRODUCT by one of the suspended test accounts
      // still renders, so a test product can be opened and its whole flow
      // tried (lib/test-accounts.ts). Products only — a test account's post or
      // milestone stays a 404 — and `hidden = false` above still applies.
      // devTestAuthorIds() is the empty Set in a production build, before it
      // reads anything, so this arm always returns null there.
      const authorId = (post as PublicPostRow).author_id;
      const devTestProduct =
        (post as PublicPostRow).kind === "show_and_tell" &&
        (await devTestAuthorIds([authorId])).has(authorId);
      if (!devTestProduct) return null;
    }

    return {
      post: post as PublicPostRow,
      author: {
        full_name: author.full_name as string | null,
        photo_url: author.photo_url as string | null,
      },
    };
  },
);

/**
 * Only the row's KIND, by id, for a redirect decision and nothing else:
 * /p/<id> sends a product on to /products/<id>, and /community/<id> does the
 * same for a member. Through the service role so it works logged out; it
 * returns no content, so it gates nothing — whichever page the reader lands
 * on applies its own gate. Null for no row, a malformed id or a failed read.
 */
export const getPostKind = cache(async (id: string): Promise<string | null> => {
  const { data, error } = await createAdminClient()
    .from("forum_posts")
    .select("kind")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return (data.kind as string | null) ?? null;
});

/** forum_posts.kind of a product. One spelling, for the code that asks. */
export const PRODUCT_KIND = "show_and_tell";

// ── The comment preview ───────────────────────────────────────────────────
// The intent has always been "show the first couple, then ask them to sign in
// to read the rest". An earlier version fetched EVERY comment, rendered every
// one into the HTML and hid the overflow with CSS — view-source, or any
// crawler, read the lot. This slices SERVER-SIDE: PREVIEW_COMMENTS rows for
// display, and a separate exact count for the "{n}" in the button. Nothing
// past the preview is sent.

/** How many comments a logged-out visitor is shown before the join gate.
 *  Two is enough to prove a conversation exists without being the archive. */
const PREVIEW_COMMENTS = 2;

/** Fetched before the author-visibility filter, so dropping a moderated
 *  commenter does not leave the preview short of PREVIEW_COMMENTS. */
const PREVIEW_FETCH = 10;

export type PreviewComment = {
  id: string;
  content: string;
  created_at: string;
  author: PublicAuthor;
};

/**
 * A public page's like count, comment preview and full comment tally for one
 * post. The preview's authors go through the same gate as a post's author: a
 * moderated account must not get an avatar and a name on a public page just
 * because it commented rather than posted. The tally counts every comment,
 * including any whose author was later moderated — the comment exists, so the
 * number is honest; it is the RENDERING of a moderated account the filter is
 * about.
 */
export async function getPublicEngagement(id: string): Promise<{
  likeCount: number;
  comments: PreviewComment[];
  total: number;
}> {
  const admin = createAdminClient();
  const [{ count: likeCount }, { data: commentRows, count: commentCount }] =
    await Promise.all([
      admin
        .from("forum_likes")
        .select("post_id", { count: "exact", head: true })
        .eq("post_id", id),
      // `count: "exact"` alongside `limit()` returns the FULL tally in the
      // Content-Range header while the body carries only the preview rows.
      admin
        .from("forum_comments")
        .select("id, author_id, content, created_at", { count: "exact" })
        .eq("post_id", id)
        .order("created_at", { ascending: true })
        .limit(PREVIEW_FETCH),
    ]);

  const previewAuthorIds = Array.from(
    new Set((commentRows ?? []).map((c) => c.author_id as string)),
  );
  const { data: previewAuthors } = previewAuthorIds.length
    ? await admin
        .from("profiles")
        .select(`id, ${PUBLIC_AUTHOR_COLUMNS}`)
        .in("id", previewAuthorIds)
    : { data: [] };
  const visibleAuthors = new Map(
    (previewAuthors ?? [])
      .filter(isPubliclyAttributable)
      .map((a) => [a.id as string, a]),
  );
  const comments: PreviewComment[] = (commentRows ?? [])
    .filter((c) => visibleAuthors.has(c.author_id as string))
    .slice(0, PREVIEW_COMMENTS)
    .map((c) => {
      const a = visibleAuthors.get(c.author_id as string);
      return {
        id: c.id as string,
        content: c.content as string,
        created_at: c.created_at as string,
        author: {
          full_name: (a?.full_name as string | null) ?? null,
          photo_url: (a?.photo_url as string | null) ?? null,
        },
      };
    });

  return { likeCount: likeCount ?? 0, comments, total: commentCount ?? 0 };
}
