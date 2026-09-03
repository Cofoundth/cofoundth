import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { tServer } from "@/lib/i18n-server";
import { AdminTabs } from "@/components/AdminTabs";
import { EmptyState, Section } from "@/components/ui";
import { Paginated } from "@/components/Paginated";
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
    <Section>
      <AdminTabs />
      <div className="mb-8">
        <div className="max-w-[640px]">
          <h1 className="text-d2 mb-2">Posts</h1>
          <p className="text-sm text-ink-muted">
            {posts.length} total · {hiddenCount} hidden
          </p>
        </div>
      </div>

      {posts.length === 0 ? (
        // KIND A — an unfiltered moderation list. Admins don't write posts from
        // here, so there is no action to offer, only what will land here.
        <EmptyState
          dense
          padding="lg"
          description={await tServer(
            "No posts yet. Everything the community writes shows up here for moderation.",
          )}
        />
      ) : (
        <Paginated
          pageSize={20}
          className="bg-white divide-y divide-line rounded-3xl shadow-xs overflow-hidden"
        >
          {posts.map((p) => (
            <PostRow key={p.id} post={p} />
          ))}
        </Paginated>
      )}
    </Section>
  );
}
