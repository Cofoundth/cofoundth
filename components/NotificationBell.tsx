"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { useT, useLocale } from "@/lib/i18n-client";
import { timeAgo } from "@/lib/time";
import { createClient } from "@/lib/supabase/client";
import {
  markAllNotificationsRead,
  dismissNotification,
  clearAllNotifications,
} from "@/app/(app)/notifications/actions";

export type NotifItem = {
  id: string;
  type: string;
  entityId: string | null;
  data: { actor_name?: string; post_title?: string } | null;
  readAt: string | null;
  createdAt: string;
  actor: {
    id: string;
    slug: string | null;
    photo_url: string | null;
    full_name: string | null;
  } | null;
};

function hrefFor(n: NotifItem): string {
  switch (n.type) {
    case "profile_view":
      return n.actor ? `/profile/${n.actor.slug ?? n.actor.id}` : "/dashboard";
    case "comment":
      return n.entityId ? `/community/${n.entityId}` : "/community";
    case "interest":
    case "match":
      return "/matches";
    default:
      return "/dashboard";
  }
}

export function NotificationBell({
  items: initialItems,
  unreadCount,
  currentUserId,
}: {
  items: NotifItem[];
  unreadCount: number;
  currentUserId: string;
}) {
  const tr = useT();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotifItem[]>(initialItems);
  const [unread, setUnread] = useState(unreadCount);
  const ref = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  // Server is the source of truth on navigation (it already includes any
  // realtime-delivered rows, which persist).
  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);
  useEffect(() => {
    setUnread(unreadCount);
  }, [unreadCount]);

  // Live: prepend new notifications as they arrive. RLS-scoped to me; the
  // socket needs the access token set BEFORE subscribing or it gets nothing.
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
      channel = supabase
        .channel(`notifications:${currentUserId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `recipient_id=eq.${currentUserId}`,
          },
          (payload) => {
            const n = payload.new as Record<string, unknown>;
            const data =
              (n.data as { actor_name?: string; post_title?: string }) ?? null;
            const item: NotifItem = {
              id: n.id as string,
              type: n.type as string,
              entityId: (n.entity_id as string | null) ?? null,
              data,
              readAt: (n.read_at as string | null) ?? null,
              createdAt: n.created_at as string,
              actor: n.actor_id
                ? {
                    id: n.actor_id as string,
                    slug: null,
                    photo_url: null,
                    full_name: data?.actor_name ?? null,
                  }
                : null,
            };
            setItems((prev) =>
              prev.some((p) => p.id === item.id) ? prev : [item, ...prev],
            );
            if (!openRef.current) setUnread((u) => u + 1);
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
            console.error("[realtime notifications] status:", status);
          }
        });
    })();
    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      setUnread(0);
      startMarkRead();
    }
  }
  function startMarkRead() {
    void markAllNotificationsRead();
  }

  async function handleDismiss(e: React.MouseEvent, id: string) {
    e.preventDefault();
    e.stopPropagation();
    const wasUnread = !items.find((i) => i.id === id)?.readAt;
    setItems((prev) => prev.filter((i) => i.id !== id));
    if (wasUnread) setUnread((u) => Math.max(0, u - 1));
    await dismissNotification(id);
  }

  async function handleClearAll() {
    setItems([]);
    setUnread(0);
    await clearAllNotifications();
  }

  function textFor(n: NotifItem): string {
    const name = n.actor?.full_name || n.data?.actor_name || tr("Someone");
    switch (n.type) {
      case "profile_view":
        return tr("{name} viewed your profile").replace("{name}", name);
      case "comment":
        return tr("{name} commented on your post").replace("{name}", name);
      case "interest":
        return tr("{name} is interested in connecting").replace("{name}", name);
      case "match":
        return tr("You and {name} are now connected").replace("{name}", name);
      default:
        return "";
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        aria-label={tr("Notifications")}
        className="relative flex items-center justify-center w-9 h-9 text-ink-muted hover:text-navy transition-colors"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-5 h-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>
        {unread > 0 && (
          <span className="absolute top-0.5 right-0 min-w-[18px] h-[18px] px-1 text-[10px] bg-gold text-white inline-flex items-center justify-center font-medium">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[28rem] overflow-y-auto bg-white border border-line shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-line">
            <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">
              {tr("Notifications")}
            </div>
            {items.length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="text-xs text-ink-muted hover:text-navy transition-colors"
              >
                {tr("Clear all")}
              </button>
            )}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-ink-muted">
              {tr("No notifications yet")}
            </div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id} className="relative group/item">
                  <Link
                    href={hrefFor(n)}
                    onClick={() => setOpen(false)}
                    className={`flex items-start gap-3 px-4 py-3 pr-9 border-b border-line last:border-b-0 hover:bg-cream transition-colors ${
                      n.readAt ? "" : "bg-cream/60"
                    }`}
                  >
                    <Avatar
                      name={n.actor?.full_name ?? n.data?.actor_name}
                      url={n.actor?.photo_url}
                      size="sm"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink leading-snug">
                        {textFor(n)}
                      </p>
                      {n.type === "comment" && n.data?.post_title ? (
                        <p className="text-xs text-ink-muted truncate mt-0.5">
                          “{n.data.post_title}”
                        </p>
                      ) : null}
                      <p className="text-xs text-ink-muted mt-0.5">
                        {timeAgo(n.createdAt, locale)}
                      </p>
                    </div>
                  </Link>
                  <button
                    type="button"
                    onClick={(e) => handleDismiss(e, n.id)}
                    aria-label={tr("Dismiss")}
                    className="absolute top-2.5 right-2 p-1 text-ink-muted hover:text-navy opacity-0 group-hover/item:opacity-100 focus:opacity-100 transition-opacity"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
