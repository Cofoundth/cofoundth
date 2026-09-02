"use client";

import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import type { PostItem } from "@/lib/post-types";
import type { Locale } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { EmptyState } from "@/components/ui";
import { PostCard } from "./PostCard";

export function PostFeed({
  items,
  locale,
  emptyState,
}: {
  items: PostItem[];
  locale: Locale;
  /**
   * Replaces the default empty state. Pass one when the page can say something
   * more specific than "nobody has posted yet".
   */
  emptyState?: ReactNode;
}) {
  const tr = useT();
  if (!items.length) {
    // KIND A — nothing exists yet, so invite them to be first. No CTA: every
    // page that renders this feed puts the composer directly above it, so a
    // button here would only point at something already on screen.
    return (
      <>
        {emptyState ?? (
          <EmptyState
            padding="lg"
            icon={MessageCircle}
            title={tr("No posts yet")}
            description={tr(
              "Be the first to start a conversation. Share what you’re building, ask for feedback, or just say hi.",
            )}
          />
        )}
      </>
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
