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

// Avatar upload runs server-side through the service-role client.
// The browser cannot upload directly to Storage on this project because Storage
// does not currently validate the asymmetric (ES256) user JWTs, so a client
// upload is rejected by RLS as anon. Going through the server also lets us
// validate ownership + file type/size before anything touches the bucket.
export async function uploadAvatarAction(
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const user = await requireUser();

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "No file received." };
  }
  const ext = EXT[file.type];
  if (!ext) {
    return { error: "Please upload a JPG, PNG, WebP, or GIF." };
  }
  if (file.size > MAX_BYTES) {
    return { error: "Max image size is 5MB." };
  }

  const admin = createAdminClient();
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await admin.storage
    .from("avatars")
    .upload(path, bytes, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type,
    });
  if (upErr) return { error: upErr.message };

  const { data } = admin.storage.from("avatars").getPublicUrl(path);
  const publicUrl = data.publicUrl;

  const { error: dbErr } = await admin
    .from("profiles")
    .update({ photo_url: publicUrl })
    .eq("id", user.id);
  if (dbErr) return { error: dbErr.message };

  return { url: publicUrl };
}
