import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";

export default async function CommunityPage() {
  const supabase = await createClient();

  // Posts feed (may fail gracefully if forum table not yet migrated)
  const { data: posts, error } = await supabase
    .from("forum_posts")
    .select("id, author_id, title, content, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  const authorIds = Array.from(
    new Set((posts ?? []).map((p) => p.author_id as string)),
  );
  const { data: authors } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url, i_am")
        .in("id", authorIds)
    : { data: [] };
  const authorMap = new Map((authors ?? []).map((a) => [a.id as string, a]));

  return (
    <div className="max-w-4xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-10 pb-8 border-b border-line flex items-start justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
            The community
          </div>
          <h1 className="text-4xl lg:text-5xl mb-2">Community</h1>
          <p className="text-ink">
            Ask, share, and learn from other Thai founders.
          </p>
        </div>
        <Link
          href="/community/new"
          className="px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" /> New post
        </Link>
      </div>

      {error?.message?.includes("forum_posts") ? (
        <div className="bg-white border border-gold/40 p-8 text-center">
          <h3 className="text-2xl mb-3">Forum is being prepared</h3>
          <p className="text-sm text-ink leading-relaxed max-w-md mx-auto">
            The community table hasn&rsquo;t been applied yet. Apply{" "}
            <code className="text-navy">
              supabase/migrations/0002_community_forum.sql
            </code>{" "}
            in your Supabase SQL Editor to enable this page.
          </p>
        </div>
      ) : !posts?.length ? (
        <div className="bg-white border border-line p-12 text-center">
          <h3 className="text-2xl mb-2">Nothing here yet</h3>
          <p className="text-ink-muted leading-relaxed max-w-md mx-auto mb-6">
            Be the first to start a conversation. Share what you&rsquo;re
            building, ask for feedback, or just say hi.
          </p>
          <Link
            href="/community/new"
            className="inline-flex items-center gap-2 px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
          >
            Write the first post <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((p) => {
            const author = authorMap.get(p.author_id as string);
            return (
              <Link
                key={p.id as string}
                href={`/community/${p.id}`}
                className="block bg-white border border-line hover:border-navy p-6 transition-colors group"
              >
                <div className="flex items-start gap-4">
                  <Avatar
                    name={author?.full_name as string}
                    url={author?.photo_url as string | null}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif text-xl text-navy mb-1 group-hover:text-gold transition-colors">
                      {p.title as string}
                    </h3>
                    <p className="text-sm text-ink leading-relaxed mb-2 line-clamp-2">
                      {p.content as string}
                    </p>
                    <div className="text-xs text-ink-muted">
                      {(author?.full_name as string) ?? "A founder"}
                      {" · "}
                      {new Date(p.created_at as string).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
