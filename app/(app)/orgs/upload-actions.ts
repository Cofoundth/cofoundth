"use server";

import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const MAX_BYTES = 5 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

// Upload a company logo / product image to the public `org-images` bucket.
// Like avatars, this runs server-side via the service role (Storage doesn't
// validate this project's ES256 user JWTs, so a direct client upload is
// rejected). The returned URL is collected by the create-company form and
// saved with the org row — this action does NOT touch the DB itself.
export async function uploadOrgImageAction(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file received." };
  }
  const ext = EXT[file.type];
  if (!ext) return { error: "Please upload a JPG, PNG, WebP, or GIF." };
  if (file.size > MAX_BYTES) return { error: "Max image size is 5MB." };

  const admin = createAdminClient();
  const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("org-images")
    .upload(path, bytes, {
      upsert: false,
      cacheControl: "3600",
      contentType: file.type,
    });
  if (upErr) return { error: upErr.message };

  const { data } = admin.storage.from("org-images").getPublicUrl(path);
  return { url: data.publicUrl };
}
