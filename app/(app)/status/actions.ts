"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type StatusState = { error?: string } | null;

export async function createStatusAction(
  _prev: StatusState,
  formData: FormData,
): Promise<StatusState> {
  const content = String(formData.get("content") ?? "").trim();
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  const kind = String(formData.get("kind") ?? "status");

  if (!content) return { error: "Say something." };
  if (content.length > 280) return { error: "Keep it under 280 characters." };
  if (linkUrl && !/^https?:\/\/.+/.test(linkUrl)) {
    return { error: "Link must start with http:// or https://" };
  }
  if (!["status", "milestone", "show_and_tell"].includes(kind)) {
    return { error: "Bad kind." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("status_updates").insert({
    author_id: user.id,
    content,
    kind,
    link_url: linkUrl || null,
  });

  if (error) {
    console.error("[status.create]", error);
    return { error: "Couldn't post. Try again." };
  }

  revalidatePath("/dashboard");
  revalidatePath("/community");
  return null;
}

export async function deleteStatusAction(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("status_updates")
    .delete()
    .eq("id", id)
    .eq("author_id", user.id);

  revalidatePath("/dashboard");
  revalidatePath("/community");
}

export async function toggleStatusLikeAction(statusId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("status_likes")
    .select("status_id")
    .eq("status_id", statusId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("status_likes")
      .delete()
      .eq("status_id", statusId)
      .eq("user_id", user.id);
  } else {
    await supabase
      .from("status_likes")
      .insert({ status_id: statusId, user_id: user.id });
  }

  revalidatePath("/dashboard");
  revalidatePath("/community");
}
