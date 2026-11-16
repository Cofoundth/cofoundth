// The pieces the two public permalinks share — /p/<id> (a post or a
// milestone) and /products/<id> (a product) — for a logged-out reader: the
// read-only comment preview, the dark "join" panel and the sticky sign-in bar.
// Moved out of app/(marketing)/p/[id]/page.tsx unchanged when products got
// their own page, so the two pages cannot drift apart. Server components.

import Link from "next/link";
import { Avatar } from "@/components/Avatar";
import { buttonClasses, Card } from "@/components/ui";
import { authHref } from "@/lib/auth-href";
import { t, type Locale } from "@/lib/i18n";
import { tServer } from "@/lib/i18n-server";
import type { PreviewComment } from "@/lib/public-post";

/** Relative time as the public pages have always printed it. */
export function publicTimeAgo(iso: string, locale: Locale): string {
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

/** The preview rows: avatar, name, time, text. */
export function CommentPreview({
  comments,
  locale,
}: {
  comments: PreviewComment[];
  locale: Locale;
}) {
  return (
    <ul className="space-y-4 empty:hidden">
      {comments.map((c) => (
        <li key={c.id} className="flex items-start gap-2.5">
          <Avatar name={c.author.full_name} url={c.author.photo_url} size="sm" />
          <div className="flex-1 min-w-0">
            <div className="text-xs text-ink-muted">
              <span className="text-navy font-medium">
                {c.author.full_name ?? t("A founder", locale)}
              </span>
              {" · "}
              {publicTimeAgo(c.created_at, locale)}
            </div>
            <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mt-0.5">
              {c.content}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The dark "join" panel under the post. */
export async function JoinCta({
  next,
  className,
}: {
  next: string;
  className?: string;
}) {
  return (
    <Card tone="navy" padding="lg" className={`${className ?? ""} text-center`}>
      {/* `text-white` on the heading itself: @layer base gives every h1–h6
          `color: navy`, which the panel's inherited white does not override,
          so without it this heading rendered navy on navy (measured: both
          rgb(27, 26, 23)). */}
      <h2 className="text-d1 mb-2 text-white">
        {await tServer("Where Thai founders connect")}
      </h2>
      <p className="text-sm text-white/70 leading-relaxed max-w-md mx-auto mb-5">
        {await tServer(
          "Community, partners, and co-founders — in one place. Free to join.",
        )}
      </p>
      <Link
        href={authHref("/signup", next)}
        className={buttonClasses({ variant: "inverse", size: "md" })}
      >
        {await tServer("Create your profile")}
      </Link>
    </Card>
  );
}

/** Persistent sign-in gate — LinkedIn-style, always visible. */
export async function StickySignIn({
  next,
  authorName,
}: {
  next: string;
  authorName: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-white/95 backdrop-blur border-t border-line shadow-[0_-2px_16px_rgba(27,26,23,0.08)]">
      <div className="max-w-[640px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
        <p className="text-sm text-ink min-w-0 truncate">
          {(
            await tServer(
              "{name} is on Cofoundee — sign in to connect and see more.",
            )
          ).replace("{name}", () => authorName)}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={authHref("/login", next)}
            className="px-3 py-2 text-sm text-ink-muted hover:text-navy"
          >
            {await tServer("Sign in")}
          </Link>
          <Link
            href={authHref("/signup", next)}
            className={buttonClasses({
              size: "sm",
              className: "whitespace-nowrap",
            })}
          >
            {await tServer("Join free")}
          </Link>
        </div>
      </div>
    </div>
  );
}
