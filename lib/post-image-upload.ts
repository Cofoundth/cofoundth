import { MAX_POST_IMAGE_BYTES } from "@/lib/post-types";
import { createAdminClient } from "@/lib/supabase/admin";

// Keyed by the same four types as POST_IMAGE_TYPES in lib/post-types.ts, which
// the pickers build their `accept` and their early type check from.
const IMG_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMG_BYTES = MAX_POST_IMAGE_BYTES;
type Upload = { url: string; path: string };

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
): Promise<(Upload & { error?: undefined }) | { error: string; url?: undefined; path?: undefined }> {
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
export async function removePostImages(uploads: { path?: string }[]) {
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
export function filesIn(formData: FormData, name: string): File[] {
  return formData
    .getAll(name)
    .filter((e): e is File => e instanceof File && e.size > 0);
}

/**
 * Validate ALL of them, then upload all of them, or none.
 * A post's one cover and a product's screenshots go through the
 * same checks, the same bucket and the same orphan cleanup.
 *
 * Validating before uploading ANY is what keeps a 6MB fourth file from leaving
 * three objects in the bucket and no row — and a size or type rejection still
 * reads as the same plain sentence it always did. On success the caller owns
 * the uploads: if its insert then fails it must removePostImages() them.
 */
export async function uploadAll(
  userId: string,
  files: File[],
  tag: string,
  /** The sentence for a failed batch of several, which says NOTHING was
   *  saved, in the caller's own words: a post is posted, a product is added,
   *  an edit is saved. */
  nothingSaved: string,
): Promise<
  | { uploads: Upload[]; error?: undefined }
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
      : { error: nothingSaved };
  }
  return { uploads: uploads.filter((upload) => upload.url !== undefined) };
}
