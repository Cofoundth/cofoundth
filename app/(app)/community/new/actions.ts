"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account";
import { canPostThread } from "@/lib/roles";

export type PostState = { error?: string } | null;

export async function createPostAction(
  _prev: PostState,
  formData: FormData,
): Promise<PostState> {
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();

  if (!title) return { error: "Title is required." };
  if (title.length > 200) return { error: "Title must be 200 chars or less." };
  if (!content) return { error: "Content is required." };
  if (content.length > 5000)
    return { error: "Content must be 5000 chars or less." };

  // Parse tags: split on whitespace/commas, normalize, dedupe, validate
  const tags = Array.from(
    new Set(
      tagsRaw
        .split(/[,\s]+/)
        .map((t) => t.trim().toLowerCase().replace(/^#/, ""))
        .filter(Boolean),
    ),
  ).slice(0, 5);
  for (const tag of tags) {
    if (!/^[\p{L}\p{N}\p{M}]+(-[\p{L}\p{N}\p{M}]+)*$/u.test(tag) || tag.length > 30) {
      return {
        error: `Bad tag "${tag}" — letters, digits, and hyphens only, max 30 chars.`,
      };
    }
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  // The SECOND top-level-post path (the /community/new full page; the other is
  // lib/post-actions.ts createPostAction). Same predicate on purpose — these
  // two write the same table and have drifted before. Blocking the ROUTE is
  // not enough: a server action is invocable without ever rendering its page.
  const role = await getAccountRole(supabase, user.id);
  if (!canPostThread(role)) {
    // An explorer reads and comments here; only starting a thread is shut.
    if (role === "explorer")
      return {
        error:
          "Explorer accounts read and comment here — they don’t start threads.",
      };
    return { error: "Only founders can post in the community." };
  }

  const { data, error } = await supabase
    .from("forum_posts")
    .insert({ author_id: user.id, title, content, tags })
    .select("id")
    .single();

  if (error) return { error: error.message };

  redirect(`/community/${data.id}`);
}
