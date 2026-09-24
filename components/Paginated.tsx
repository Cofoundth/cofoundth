"use client";

import { Children, useState } from "react";
import { Button } from "@/components/ui";

// Client-side pagination over a list of (already-rendered) children. Cheap and
// works up to the server fetch cap; swap to a cursor query if a list ever
// exceeds that cap. Pass a `key` that changes with filters to reset to page 1.
export function Paginated({
  children,
  pageSize = 20,
  className,
}: {
  children: React.ReactNode;
  pageSize?: number;
  className?: string;
}) {
  const items = Children.toArray(children);
  const [page, setPage] = useState(0);
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const p = Math.min(page, pages - 1);
  const slice = items.slice(p * pageSize, p * pageSize + pageSize);

  return (
    <>
      <div className={className}>{slice}</div>
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <Button
            variant="secondary"
            size="xs"
            disabled={p === 0}
            onClick={() => setPage(p - 1)}
            className="text-sm tracking-wide"
          >
            ← Prev
          </Button>
          <span className="text-ink-muted text-xs">
            {p + 1} / {pages}
          </span>
          <Button
            variant="secondary"
            size="xs"
            disabled={p >= pages - 1}
            onClick={() => setPage(p + 1)}
            className="text-sm tracking-wide"
          >
            Next →
          </Button>
        </div>
      )}
    </>
  );
}
