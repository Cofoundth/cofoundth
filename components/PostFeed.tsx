"use client";

import type { PostItem } from "@/lib/post-types";
import type { Locale } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { PostCard } from "./PostCard";

export function PostFeed({
  items,
  locale,
  emptyMessage,
}: {
  items: PostItem[];
  locale: Locale;
  emptyMessage?: string;
}) {
  const tr = useT();
  if (!items.length) {
    return (
      <div className="bg-white border border-line p-8 text-center text-sm text-ink-muted">
        {emptyMessage ?? tr("No posts yet — be the first.")}
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <PostCard key={p.id} post={p} locale={locale} />
      ))}
    </div>
  );
}
