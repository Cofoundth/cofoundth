"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import type { PostItem } from "@/lib/post-types";
import type { Locale } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { PostCard } from "./PostCard";

// Post feed with an instant client-side search box (title / content / author /
// tags). Filters the already-loaded posts — fine at current scale.
export function SearchablePostFeed({
  items,
  locale,
  emptyMessage,
  composer,
  initialQuery,
}: {
  items: PostItem[];
  locale: Locale;
  emptyMessage?: string;
  composer?: React.ReactNode;
  initialQuery?: string;
}) {
  const tr = useT();
  const [q, setQ] = useState(initialQuery ?? "");
  const query = q.trim().toLowerCase();

  const filtered = query
    ? items.filter(
        (p) =>
          p.content.toLowerCase().includes(query) ||
          (p.title?.toLowerCase().includes(query) ?? false) ||
          (p.author?.full_name?.toLowerCase().includes(query) ?? false) ||
          p.tags.some((t) => t.toLowerCase().includes(query)),
      )
    : items;

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none"
          strokeWidth={1.5}
        />
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tr("Search posts…")}
          className="w-full pl-10 pr-4 py-2.5 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy"
        />
      </div>

      {!query && composer}

      {filtered.length === 0 ? (
        <div className="bg-white border border-line p-8 text-center text-sm text-ink-muted">
          {query
            ? tr("No posts match your search.")
            : (emptyMessage ?? tr("No posts yet — be the first."))}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((p) => (
            <PostCard key={p.id} post={p} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
