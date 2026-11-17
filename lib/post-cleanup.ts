// What has to go with a forum_posts row when it is deleted, and the one place
// that does it — for a member deleting their own post or product, and for an
// admin removing one (lib/admin-actions.ts adminDeletePost, and "Remove
// content" on a report, lib/post-actions.ts moderateReportAction).
//
// Deleting the row cascades its likes, comments and ratings (foreign keys),
// but two things live OUTSIDE it and do not cascade:
//
//   · its IMAGES — objects in the post-images bucket. A deleted row's image
//     stays public at its URL until something removes it, which on a removal
//     for moderation means the very picture that was reported stays online.
//   · its NOTIFICATIONS — "commented on your post / product" and mentions,
//     keyed by entity_id = the row's id. Left behind, each one opens a page
//     that no longer exists.
//
// A plain module, not "use server": lib/post-actions.ts and
// lib/admin-actions.ts are action files, which may only export async actions,
// and both need these. Server-only through createAdminClient.

import { createAdminClient } from "@/lib/supabase/admin";

const PUBLIC_POST_IMAGES = "/storage/v1/object/public/post-images/";

/**
 * Best-effort: remove images from the post-images bucket. Only objects in
 * `userId`'s OWN folder — uploadPostImage writes `<user id>/post-…`, and
 * migration 0083 refuses a member-written image anywhere else — so a URL that
 * points elsewhere, or at somebody else's upload, is left alone. A failure is
 * logged, never shown: the row is already right.
 */
export async function removeOwnImages(
  userId: string,
  urls: string[],
  tag: string,
): Promise<void> {
  const paths = urls
    .map((url) => {
      const i = url.indexOf(PUBLIC_POST_IMAGES);
      if (i === -1) return null;
      try {
        return decodeURIComponent(url.slice(i + PUBLIC_POST_IMAGES.length));
      } catch {
        return null;
      }
    })
    .filter(
      (p): p is string =>
        !!p && p.startsWith(`${userId}/`) && !p.includes(".."),
    );
  if (!paths.length) return;
  const { error } = await createAdminClient()
    .storage.from("post-images")
    .remove(paths);
  if (error) console.error(`[${tag}] orphaned images`, paths, error.message);
}

/** The columns cleanUpDeletedPost needs; select them BEFORE the delete. */
export const DELETED_POST_COLUMNS = "id, author_id, kind, image_url, image_urls";

export type DeletedPost = {
  id: string;
  author_id: string;
  /** forum_posts.kind — 'show_and_tell' is a product. */
  kind: string;
  image_url: string | null;
  image_urls: string[] | null;
};

/**
 * After a forum_posts row is gone: its comment and mention notifications, and
 * its images. Call it only once the delete is CONFIRMED (a `.select()` on the
 * delete that came back with the row) — on a failed delete it would strip a
 * live post of its pictures. Best-effort throughout.
 */
export async function cleanUpDeletedPost(
  row: DeletedPost,
  tag: string,
): Promise<void> {
  // Notifications are insert- and delete-locked by RLS (0028), hence the
  // service role.
  const { error } = await createAdminClient()
    .from("notifications")
    .delete()
    .eq("entity_id", row.id)
    .in("type", ["comment", "mention"]);
  if (error) console.error(`[${tag}] notifications`, error.message);
  // BOTH columns, not postImages(): that returns image_urls OR image_url (it
  // answers "what does this row show"), and a legacy row can hold an
  // image_url that its image_urls does not repeat.
  const urls = new Set([
    ...(row.image_urls ?? []),
    ...(row.image_url ? [row.image_url] : []),
  ]);
  await removeOwnImages(row.author_id, [...urls], tag);
}
