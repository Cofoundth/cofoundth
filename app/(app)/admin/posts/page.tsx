import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { AdminTabs } from "@/components/AdminTabs";
import { PostRow, type AdminPost } from "./PostRow";

export const dynamic = "force-dynamic";

export default async function AdminPostsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("forum_posts")
    .select("id, content, author_id, hidden, created_at")
    .order("created_at", { ascending: false })
    .limit(300);

  const list = rows ?? [];
  const authorIds = Array.from(new Set(list.map((p) => p.author_id as string)));
  const { data: authors } = authorIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, slug")
        .in("id", authorIds)
    : { data: [] as { id: string; full_name: string | null; slug: string | null }[] };
  const am = new Map((authors ?? []).map((a) => [a.id as string, a]));

  const posts: AdminPost[] = list.map((p) => {
    const a = am.get(p.author_id as string);
    return {
      id: p.id as string,
      content: p.content as string,
      authorName: (a?.full_name as string | null) ?? null,
      authorSlug: (a?.slug as string | null) ?? null,
      authorId: p.author_id as string,
      hidden: !!p.hidden,
      createdAt: p.created_at as string,
    };
  });

  const hiddenCount = posts.filter((p) => p.hidden).length;

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <AdminTabs />
      <div className="mb-8 pb-6 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          Admin
        </div>
        <h1 className="text-4xl mb-2">Posts</h1>
        <p className="text-ink">
          {posts.length} total · {hiddenCount} hidden
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center text-ink-muted">
          No posts yet.
        </div>
      ) : (
        <div className="bg-white border border-line divide-y divide-line">
          {posts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </div>
      )}
    </div>
  );
}
