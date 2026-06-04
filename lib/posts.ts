// Server-only: fetch + shape the merged post feed (forum_posts).
// Used by the dashboard and /community so both render the identical feed.

import { type createClient } from "@/lib/supabase/server";
import type { PostItem, PostKind } from "./post-types";

type DB = Awaited<ReturnType<typeof createClient>>;

const POST_COLS =
  "id, author_id, title, content, kind, link_url, image_url, tags, created_at";

type PostRow = Record<string, unknown>;

// Turn raw forum_posts rows into PostItems (authors, like + comment counts).
async function shapePosts(
  supabase: DB,
  posts: PostRow[],
  userId?: string | null,
): Promise<PostItem[]> {
  if (!posts.length) return [];

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

export async function getFeedPosts(
  supabase: DB,
  {
    limit = 30,
    userId,
    before,
  }: { limit?: number; userId?: string | null; before?: string | null },
): Promise<PostItem[]> {
  let q = supabase
    .from("forum_posts")
    .select(POST_COLS)
    .eq("hidden", false)
    .order("created_at", { ascending: false })
    .limit(limit);
  // Cursor pagination: fetch the page strictly older than `before`.
  if (before) q = q.lt("created_at", before);

  const { data: posts } = await q;
  return shapePosts(supabase, posts ?? [], userId);
}

// Full-DB search across title, content, tags, and author name. Unlike the old
// client-side filter, this looks beyond the loaded page.
export async function searchPosts(
  supabase: DB,
  rawQuery: string,
  userId?: string | null,
  limit = 40,
): Promise<PostItem[]> {
  const q = rawQuery.trim();
  if (q.length < 2) return [];
  const like = `%${q}%`;

  const { data: namedAuthors } = await supabase
    .from("profiles")
    .select("id")
    .ilike("full_name", like)
    .limit(50);
  const authorIds = (namedAuthors ?? []).map((a) => a.id as string);

  const base = () =>
    supabase
      .from("forum_posts")
      .select(POST_COLS)
      .eq("hidden", false)
      .order("created_at", { ascending: false })
      .limit(limit);

  const [byContent, byTitle, byTag, byAuthor] = await Promise.all([
    base().ilike("content", like),
    base().ilike("title", like),
    base().contains("tags", [q.toLowerCase()]),
    authorIds.length
      ? base().in("author_id", authorIds)
      : Promise.resolve({ data: [] as PostRow[] }),
  ]);

  // Merge unique by id, keep newest first.
  const seen = new Map<string, PostRow>();
  for (const set of [byContent, byTitle, byTag, byAuthor]) {
    for (const p of (set.data ?? []) as PostRow[]) {
      if (!seen.has(p.id as string)) seen.set(p.id as string, p);
    }
  }
  const merged = Array.from(seen.values())
    .sort((a, b) =>
      (b.created_at as string).localeCompare(a.created_at as string),
    )
    .slice(0, limit);

  return shapePosts(supabase, merged, userId);
}
