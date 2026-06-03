"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFeedPosts, searchPosts } from "@/lib/posts";
import type { PostComment, PostItem } from "@/lib/post-types";

export type PostFormState = { error?: string } | null;

const KINDS = ["post", "milestone", "show_and_tell"];

function revalidateFeeds(postId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/community");
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

const IMG_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};
const MAX_IMG_BYTES = 5 * 1024 * 1024;

async function uploadPostImage(
  userId: string,
  file: File,
): Promise<{ url?: string; error?: string }> {
  const ext = IMG_EXT[file.type];
  if (!ext) return { error: "Please upload a JPG, PNG, WebP, or GIF." };
  if (file.size > MAX_IMG_BYTES) return { error: "Max image size is 5MB." };
  const admin = createAdminClient();
  const path = `${userId}/post-${Date.now()}.${ext}`;
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
  if (linkUrl && !/^https?:\/\/.+/.test(linkUrl))
    return { error: "Link must start with http:// or https://" };

  const parsed = parseTags(tagsRaw);
  if (!Array.isArray(parsed)) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  let imageUrl: string | null = null;
  const imageFile = formData.get("image");
  if (imageFile instanceof File && imageFile.size > 0) {
    const up = await uploadPostImage(user.id, imageFile);
    if (up.error) return { error: up.error };
    imageUrl = up.url ?? null;
  }

  const { error } = await supabase.from("forum_posts").insert({
    author_id: user.id,
    content,
    title: title || null,
    kind,
    link_url: linkUrl || null,
    image_url: imageUrl,
    tags: parsed,
  });

  if (error) {
    console.error("[post.create]", error);
    return { error: "Couldn't post. Try again." };
  }

  revalidateFeeds();
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
export async function loadMoreFeedAction(before: string): Promise<PostItem[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return getFeedPosts(supabase, { limit: 20, userId: user?.id ?? null, before });
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
