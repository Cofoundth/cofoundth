"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n-client";

// Twitter-style "new activity — tap to refresh" pill. Subscribes to INSERTs on
// a table (optionally filtered), counts rows from OTHER people, and lets the
// user pull them in via router.refresh() — which re-runs the server component
// with fully-joined data (avoids reconstructing author/like joins client-side).
export function RealtimeRefresh({
  table,
  filter,
  currentUserId,
  senderColumn = "author_id",
  kind,
}: {
  table: string;
  filter?: string;
  currentUserId: string;
  senderColumn?: string;
  kind: "posts" | "comments";
}) {
  const router = useRouter();
  const tr = useT();
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      if (session?.access_token) supabase.realtime.setAuth(session.access_token);
      const changeOpts: {
        event: "INSERT";
        schema: string;
        table: string;
        filter?: string;
      } = { event: "INSERT", schema: "public", table };
      if (filter) changeOpts.filter = filter;
      channel = supabase
        .channel(`rt:${table}:${filter ?? "all"}`)
        .on("postgres_changes", changeOpts, (payload) => {
          const row = payload.new as Record<string, unknown>;
          // Ignore my own inserts — my action's revalidate already shows them.
          if (currentUserId && row[senderColumn] === currentUserId) return;
          setCount((c) => c + 1);
        })
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error(`[realtime ${table}] status:`, status);
          }
        });
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [table, filter, currentUserId, senderColumn]);

  if (count === 0) return null;

  const label = (
    kind === "comments"
      ? tr("{n} new comments — tap to refresh")
      : tr("{n} new posts — tap to refresh")
  ).replace("{n}", String(count));

  return (
    <div className="flex justify-center mb-4">
      <button
        type="button"
        onClick={() => {
          setCount(0);
          router.refresh();
        }}
        className="inline-flex items-center gap-2 px-4 py-2 bg-navy text-white text-sm tracking-wide hover:bg-navy-dark transition-colors shadow-sm"
      >
        <RefreshCw className="w-3.5 h-3.5" /> {label}
      </button>
    </div>
  );
}
