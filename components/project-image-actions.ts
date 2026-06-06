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

// One image per call — the client uploads project images one at a time and
// collects the returned URLs. Goes through the service-role client for the
// same ES256/Storage-RLS reason as the avatar upload. Reuses the existing
// `post-images` bucket (cleaned up per-user on account deletion).
export async function uploadProjectImageAction(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { error: "No file received." };
  const ext = EXT[file.type];
  if (!ext) return { error: "Please upload a JPG, PNG, WebP, or GIF." };
  if (file.size > MAX_BYTES) return { error: "Max image size is 5MB." };

  const admin = createAdminClient();
  const path = `${user.id}/project-${crypto.randomUUID()}.${ext}`;
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
    url: admin.storage.from("post-images").getPublicUrl(path).data.publicUrl,
  };
}
