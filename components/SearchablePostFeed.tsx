"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Search } from "lucide-react";
import type { PostItem } from "@/lib/post-types";
import type { Locale } from "@/lib/i18n";
import { useT } from "@/lib/i18n-client";
import { loadMoreFeedAction, searchFeedAction } from "@/lib/post-actions";
import { PostCard } from "./PostCard";

const LOAD_MORE_PAGE = 20;

// Post feed with full-DB search (debounced server query) + cursor pagination
// (infinite scroll). Search reaches every post, not just the loaded page.
export function SearchablePostFeed({
  items,
  locale,
  emptyMessage,
  composer,
  initialQuery,
  canLoadMore = false,
}: {
  items: PostItem[];
  locale: Locale;
  emptyMessage?: string;
  composer?: React.ReactNode;
  initialQuery?: string;
  canLoadMore?: boolean;
}) {
  const tr = useT();

  const [feed, setFeed] = useState<PostItem[]>(items);
  const [hasMore, setHasMore] = useState(canLoadMore);
  const [loadingMore, setLoadingMore] = useState(false);

  const [q, setQ] = useState(initialQuery ?? "");
  const [results, setResults] = useState<PostItem[] | null>(null);
  const [searching, setSearching] = useState(false);

  const searchActive = q.trim().length >= 2;

  // Keep the feed fresh across server revalidations (like/comment/new post)
  // WITHOUT discarding pages the user already scrolled in: refresh the first
  // page from `items`, keep the appended tail. Done during render (comparing
  // against the prop we last merged) so it isn't a setState-in-effect.
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setFeed((prev) => {
      const freshIds = new Set(items.map((p) => p.id));
      const tail = prev.filter((p) => !freshIds.has(p.id));
      return [...items, ...tail];
    });
  }

  // The synchronous part of search state (flag on, or full reset when the term
  // is too short) is derived during render keyed on `q` — the spinner shows the
  // moment typing crosses the threshold, and clears immediately below it. The
  // actual fetch lives in the effect below.
  const [prevSearchQ, setPrevSearchQ] = useState(q);
  if (q !== prevSearchQ) {
    setPrevSearchQ(q);
    if (q.trim().length < 2) {
      setResults(null);
      setSearching(false);
    } else {
      setSearching(true);
    }
  }

  // Debounced full-DB search (only when the term is long enough). A per-run
  // cancelled flag (flipped by cleanup on the next keystroke) drops any
  // out-of-order result.
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    let cancelled = false;
    const handle = setTimeout(async () => {
      const r = await searchFeedAction(term);
      if (!cancelled) {
        setResults(r);
        setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [q]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || feed.length === 0) return;
    setLoadingMore(true);
    const cursor = feed[feed.length - 1].created_at;
    const next = await loadMoreFeedAction(cursor);
    setFeed((prev) => {
      const ids = new Set(prev.map((p) => p.id));
      return [...prev, ...next.filter((p) => !ids.has(p.id))];
    });
    setHasMore(next.length === LOAD_MORE_PAGE);
    setLoadingMore(false);
  }, [loadingMore, hasMore, feed]);

  // Auto-load when the sentinel scrolls into view.
  const sentinelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (searchActive || !hasMore) return;
    const el = sentinelRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [searchActive, hasMore, loadMore]);

  const list = searchActive ? (results ?? []) : feed;

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
          className="w-full pl-10 pr-10 py-2.5 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted animate-spin" />
        )}
      </div>

      {!searchActive && composer}

      {searchActive && searching && results === null ? (
        <div className="bg-white border border-line p-8 text-center text-sm text-ink-muted">
          {tr("Searching…")}
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white border border-line p-8 text-center text-sm text-ink-muted">
          {searchActive
            ? tr("No posts match your search.")
            : (emptyMessage ?? tr("No posts yet — be the first."))}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <PostCard key={p.id} post={p} locale={locale} />
          ))}
        </div>
      )}

      {!searchActive && hasMore && (
        <div ref={sentinelRef} className="pt-1 text-center">
          <button
            type="button"
            onClick={() => void loadMore()}
            disabled={loadingMore}
            className="px-5 py-2 border border-line bg-white hover:border-navy text-sm text-ink tracking-wide transition-colors disabled:opacity-60"
          >
            {loadingMore ? tr("Loading…") : tr("Load more")}
          </button>
        </div>
      )}
    </div>
  );
}
