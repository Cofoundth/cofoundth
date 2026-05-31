"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { PostComment } from "@/lib/post-types";

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
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tag) || tag.length > 30) {
      return {
        error: `Bad tag "${tag}" — lowercase letters/digits/hyphens only.`,
      };
    }
  }
  return tags;
}

export async function createPostAction(
  _prev: PostFormState,
  formData: FormData,
): Promise<PostFormState> {
  const content = String(formData.get("content") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? "post");
  const linkUrl = String(formData.get("link_url") ?? "").trim();
  const imageUrl = String(formData.get("image_url") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();

  if (!content) return { error: "Say something." };
  if (content.length > 5000)
    return { error: "Keep it under 5000 characters." };
  if (title.length > 200) return { error: "Title must be 200 chars or less." };
  if (!KINDS.includes(kind)) return { error: "Bad kind." };
  if (linkUrl && !/^https?:\/\/.+/.test(linkUrl))
    return { error: "Link must start with http:// or https://" };
  if (imageUrl && !/^https?:\/\/.+/.test(imageUrl))
    return { error: "Bad image." };

  const parsed = parseTags(tagsRaw);
  if (!Array.isArray(parsed)) return parsed;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { error } = await supabase.from("forum_posts").insert({
    author_id: user.id,
    content,
    title: title || null,
    kind,
    link_url: linkUrl || null,
    image_url: imageUrl || null,
    tags: parsed,
  });

  if (error) {
    console.error("[post.create]", error);
    return { error: "Couldn't post. Try again." };
  }

  revalidateFeeds();
  return null;
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
  revalidateFeeds(postId);
  return null;
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
