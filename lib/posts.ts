// Server-only: fetch + shape the merged post feed (forum_posts).
// Used by the dashboard and /community so both render the identical feed.

import { type createClient } from "@/lib/supabase/server";
import type { PostItem, PostKind } from "./post-types";

type DB = Awaited<ReturnType<typeof createClient>>;

export async function getFeedPosts(
  supabase: DB,
  { limit = 30, userId }: { limit?: number; userId?: string | null },
): Promise<PostItem[]> {
  const { data: posts } = await supabase
    .from("forum_posts")
    .select(
      "id, author_id, title, content, kind, link_url, image_url, tags, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!posts?.length) return [];

  const ids = posts.map((p) => p.id as string);
  const authorIds = Array.from(
    new Set(posts.map((p) => p.author_id as string)),
  );

  const [{ data: authors }, { data: likes }, { data: comments }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id, full_name, photo_url, slug")
        .in("id", authorIds),
      supabase.from("forum_likes").select("post_id, user_id").in("post_id", ids),
      supabase.from("forum_comments").select("post_id").in("post_id", ids),
    ]);

  const authorMap = new Map((authors ?? []).map((a) => [a.id as string, a]));

  const likeCount = new Map<string, number>();
  const myLikes = new Set<string>();
  (likes ?? []).forEach((l) => {
    const k = l.post_id as string;
    likeCount.set(k, (likeCount.get(k) ?? 0) + 1);
    if (userId && l.user_id === userId) myLikes.add(k);
  });

  const commentCount = new Map<string, number>();
  (comments ?? []).forEach((c) => {
    const k = c.post_id as string;
    commentCount.set(k, (commentCount.get(k) ?? 0) + 1);
  });

  return posts.map((p) => {
    const a = authorMap.get(p.author_id as string);
    return {
      id: p.id as string,
      title: (p.title as string | null) ?? null,
      content: p.content as string,
      kind: ((p.kind as string) ?? "post") as PostKind,
      link_url: (p.link_url as string | null) ?? null,
      image_url: (p.image_url as string | null) ?? null,
      tags: ((p.tags as string[] | null) ?? []) as string[],
      created_at: p.created_at as string,
      author: a
        ? {
            id: a.id as string,
            full_name: (a.full_name as string | null) ?? null,
            photo_url: (a.photo_url as string | null) ?? null,
            slug: (a.slug as string | null) ?? null,
          }
        : null,
      isOwn: !!userId && p.author_id === userId,
      likeCount: likeCount.get(p.id as string) ?? 0,
      myLike: myLikes.has(p.id as string),
      commentCount: commentCount.get(p.id as string) ?? 0,
    };
  });
}
