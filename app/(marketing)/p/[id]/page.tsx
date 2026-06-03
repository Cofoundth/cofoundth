import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ExternalLink, Rocket, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { tServer, getLocale } from "@/lib/i18n-server";
import { t, type Locale } from "@/lib/i18n";
import { Avatar } from "@/components/Avatar";
import { ShareButton } from "@/components/ShareButton";
import { PublicPostActions } from "@/components/PublicPostActions";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function timeAgo(iso: string, locale: Locale): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (m < 1) return t("just now", locale);
  if (m < 60) return t("{n}m ago", locale).replace("{n}", String(m));
  if (h < 24) return t("{n}h ago", locale).replace("{n}", String(h));
  if (d < 7) return t("{n}d ago", locale).replace("{n}", String(d));
  return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const admin = createAdminClient();
  const { data: post } = await admin
    .from("forum_posts")
    .select("title, content, image_url")
    .eq("id", id)
    .maybeSingle();
  if (!post) return { title: "Post" };
  const title =
    (post.title as string | null) ?? (post.content as string).slice(0, 70);
  const description = (post.content as string).slice(0, 160);
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";
  // Always emit an image so the social card is rich — the post's own image,
  // or the branded site image as a fallback.
  const images = [(post.image_url as string | null) ?? `${SITE_URL}/og-image.png`];
  return {
    // Bare title — the root layout's "%s · Cofoundee" template adds the suffix.
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}/p/${id}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

const KIND_META: Record<
  string,
  { icon: typeof Trophy; en: string; tone: string } | null
> = {
  post: null,
  milestone: { icon: Trophy, en: "hit a milestone", tone: "text-gold" },
  show_and_tell: { icon: Rocket, en: "shipped", tone: "text-navy" },
};

export default async function PublicPostPage({ params }: Props) {
  const { id } = await params;

  // Logged-in members get the full in-app experience (interactions work there).
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/community/${id}`);

  const admin = createAdminClient();
  const { data: post } = await admin
    .from("forum_posts")
    .select(
      "id, author_id, title, content, kind, link_url, image_url, tags, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (!post) notFound();

  const locale = await getLocale();

  const [{ data: author }, { count: likeCount }, { data: comments }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id, full_name, photo_url, i_am")
        .eq("id", post.author_id)
        .maybeSingle(),
      admin
        .from("forum_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", id),
      admin
        .from("forum_comments")
        .select("id, author_id, content, created_at")
        .eq("post_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const commentAuthorIds = Array.from(
    new Set((comments ?? []).map((c) => c.author_id as string)),
  );
  const { data: commentAuthors } = commentAuthorIds.length
    ? await admin
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", commentAuthorIds)
    : { data: [] };
  const cAuthorMap = new Map(
    (commentAuthors ?? []).map((a) => [a.id as string, a]),
  );

  const meta = KIND_META[(post.kind as string) ?? "post"];
  const KindIcon = meta?.icon;
  const aFounder = await tServer("A founder");
  const authorName = (author?.full_name as string | null) ?? aFounder;
  const tags = (post.tags as string[] | null) ?? [];
  const commentsGated = (comments ?? []).length > 2;

  return (
    <div className="max-w-2xl mx-auto px-6 lg:px-10 py-12 pb-28">
      <article className="bg-white border border-line p-8 lg:p-10">
        {/* Author */}
        <div className="flex items-center gap-3 mb-5">
          <Avatar
            name={author?.full_name as string | null}
            url={author?.photo_url as string | null}
            size="md"
          />
          <div className="min-w-0">
            <div className="text-navy font-medium">{authorName}</div>
            <div className="text-xs text-ink-muted flex items-center gap-2">
              {meta && KindIcon && (
                <span className={`inline-flex items-center gap-1 ${meta.tone}`}>
                  <KindIcon className="w-3 h-3" strokeWidth={1.5} />
                  {await tServer(meta.en)}
                </span>
              )}
              {meta && <span>·</span>}
              <span>{timeAgo(post.created_at as string, locale)}</span>
            </div>
          </div>
        </div>

        {post.title && (
          <h1 className="font-serif text-3xl text-navy leading-tight mb-3">
            {post.title as string}
          </h1>
        )}

        <p className="text-ink leading-relaxed whitespace-pre-wrap">
          {post.content as string}
        </p>

        {post.image_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url as string}
            alt=""
            className="mt-4 max-h-[32rem] w-auto border border-line"
          />
        )}

        {post.link_url && (
          <a
            href={post.link_url as string}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm text-navy hover:text-gold underline underline-offset-4 decoration-gold/30 break-all"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {(() => {
              try {
                return new URL(post.link_url as string).hostname.replace(
                  /^www\./,
                  "",
                );
              } catch {
                return post.link_url as string;
              }
            })()}
          </a>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-[0.1em] px-2 py-0.5 border border-line text-ink-muted"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-line flex items-center justify-between gap-4">
          <PublicPostActions
            likeCount={likeCount ?? 0}
            commentCount={(comments ?? []).length}
          />
          <ShareButton
            title={
              (post.title as string | null) ??
              (post.content as string).slice(0, 80)
            }
          />
        </div>
      </article>

      {/* Comments (read-only) */}
      {(comments ?? []).length > 0 && (
        <section className="mt-6 bg-white border border-line p-6 lg:p-8">
          <h2 className="text-xs uppercase tracking-[0.25em] text-gold mb-5">
            {await tServer("Comments")}
          </h2>
          <div className="relative">
            <ul
              className={`space-y-4 ${
                commentsGated ? "max-h-44 overflow-hidden" : ""
              }`}
            >
              {(comments ?? []).map((c) => {
                const a = cAuthorMap.get(c.author_id as string);
                return (
                  <li key={c.id as string} className="flex items-start gap-2.5">
                    <Avatar
                      name={a?.full_name as string | null}
                      url={a?.photo_url as string | null}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-ink-muted">
                        <span className="text-navy font-medium">
                          {(a?.full_name as string | null) ?? aFounder}
                        </span>
                        {" · "}
                        {timeAgo(c.created_at as string, locale)}
                      </div>
                      <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mt-0.5">
                        {c.content as string}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            {commentsGated && (
              <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-white via-white to-transparent flex items-end justify-center">
                <Link
                  href="/signup"
                  className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
                >
                  {(await tServer("Sign in to see all {n} comments")).replace(
                    "{n}",
                    String((comments ?? []).length),
                  )}
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Join CTA */}
      <div className="mt-6 bg-navy text-white p-8 text-center">
        <h2 className="font-serif text-2xl mb-2">
          {await tServer("Where Thai founders connect")}
        </h2>
        <p className="text-sm text-white/70 leading-relaxed max-w-md mx-auto mb-5">
          {await tServer(
            "Community, partners, and co-founders — in one place. Free to join.",
          )}
        </p>
        <Link
          href="/signup"
          className="inline-block bg-white text-navy px-6 py-3 text-sm tracking-wide hover:bg-cream transition-colors"
        >
          {await tServer("Create your profile")}
        </Link>
      </div>

      {/* Persistent sign-in gate — LinkedIn-style, always visible */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-line shadow-[0_-2px_16px_rgba(10,31,68,0.08)]">
        <div className="max-w-2xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <p className="text-sm text-ink min-w-0 truncate">
            {(
              await tServer(
                "{name} is on Cofoundee — sign in to connect and see more.",
              )
            ).replace("{name}", authorName)}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/login"
              className="px-3 py-2 text-sm text-ink-muted hover:text-navy"
            >
              {await tServer("Sign in")}
            </Link>
            <Link
              href="/signup"
              className="px-4 py-2 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors whitespace-nowrap"
            >
              {await tServer("Join free")}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
