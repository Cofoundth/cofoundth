import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Avatar } from "@/components/Avatar";
import { ROLE_LABELS } from "@/lib/matching";

type Props = { params: Promise<{ id: string }> };

export default async function PostPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("forum_posts")
    .select("id, author_id, title, content, created_at")
    .eq("id", id)
    .single();

  if (!post) notFound();

  const { data: author } = await supabase
    .from("profiles")
    .select("id, full_name, photo_url, i_am")
    .eq("id", post.author_id as string)
    .single();

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-10">
      <Link
        href="/community"
        className="text-sm text-ink-muted hover:text-navy mb-8 inline-flex items-center gap-1.5"
      >
        <ArrowLeft className="w-4 h-4" /> Back to community
      </Link>

      <article className="bg-white border border-line p-8 lg:p-12">
        <h1 className="text-3xl lg:text-4xl mb-6 leading-tight">
          {post.title as string}
        </h1>

        <div className="flex items-center gap-3 mb-8 pb-8 border-b border-line">
          <Link href={`/profile/${author?.id}`}>
            <Avatar
              name={author?.full_name as string}
              url={author?.photo_url as string | null}
              size="md"
            />
          </Link>
          <div>
            <Link
              href={`/profile/${author?.id}`}
              className="font-serif text-lg text-navy hover:text-gold transition-colors"
            >
              {(author?.full_name as string) ?? "A founder"}
            </Link>
            <div className="text-xs text-ink-muted">
              {author?.i_am && ROLE_LABELS[author.i_am as string]}
              {" · "}
              {new Date(post.created_at as string).toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
          </div>
        </div>

        <div className="prose prose-sm max-w-none">
          {(post.content as string).split("\n\n").map((para, i) => (
            <p
              key={i}
              className="text-ink leading-relaxed mb-4 whitespace-pre-wrap"
            >
              {para}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
