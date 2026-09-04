// การแจ้งเตือน — notifications as a first-class page, the way the reference
// app's sidebar treats them. The bell keeps the last few for a glance; this
// is the full history with mark-all-read. Same mapping as the bell
// (lib/notifications), so every row deep-links and reads identically.

import Link from "next/link";
import { Bell, Check, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { tServer, getLocale } from "@/lib/i18n-server";
import { timeAgo } from "@/lib/time";
import { notifHref, notifText, type NotifLike } from "@/lib/notifications";
import { getBlockedIds } from "@/lib/blocking";
import { Avatar } from "@/components/Avatar";
import { Card, EmptyState, Section } from "@/components/ui";
import { markAllNotificationsRead } from "./actions";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// The reference app's panel splits by kind (All / My meetups / Invites);
// ours splits along OUR notification vocabulary — meetup activity vs the
// co-founder flow. All is the default; the unread figure follows the open
// tab, but Mark-all-read clears everything (one read state, not three).
const TAB_TYPES: Record<string, string[]> = {
  meetups: ["meetup_rsvp"],
  connections: ["interest", "match", "message"],
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  // hasOwn, not a truthy lookup: `?tab=constructor` resolves up the prototype
  // chain to a FUNCTION, which sails past the truthy check and reaches
  // .in("type", <function>) — a 500 on a hand-typed URL.
  const tab =
    tabParam && Object.hasOwn(TAB_TYPES, tabParam) ? tabParam : "all";
  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();
  const tr = (en: string) => t(en, locale);

  let query = supabase
    .from("notifications")
    .select("id, type, entity_id, data, read_at, created_at, actor_id")
    .eq("recipient_id", user.id);
  if (tab !== "all") query = query.in("type", TAB_TYPES[tab]);
  const { data: rows } = await query
    .order("created_at", { ascending: false })
    .limit(50);
  // A block hides the person everywhere they can be seen, history included —
  // otherwise their name keeps surfacing here after they're gone from every
  // other surface. Post-filter: the reverse direction of a block is
  // RLS-invisible, so it can't be a query clause.
  const blocked = await getBlockedIds(user.id);
  const notifs = (rows ?? []).filter(
    (n) => !n.actor_id || !blocked.has(n.actor_id as string),
  );

  const actorIds = [
    ...new Set(notifs.map((n) => n.actor_id as string | null).filter(Boolean)),
  ] as string[];
  const { data: actors } = actorIds.length
    ? await supabase
        .from("profiles")
        .select("id, slug, full_name, photo_url")
        .in("id", actorIds)
    : { data: [] };
  const actorById = new Map((actors ?? []).map((a) => [a.id as string, a]));

  const items = notifs.map((n) => {
    const actor = n.actor_id ? (actorById.get(n.actor_id as string) ?? null) : null;
    const like: NotifLike = {
      type: n.type as string,
      entityId: (n.entity_id as string | null) ?? null,
      data: (n.data as NotifLike["data"]) ?? null,
      actor: actor
        ? {
            id: actor.id as string,
            slug: (actor.slug as string | null) ?? null,
            full_name: (actor.full_name as string | null) ?? null,
            photo_url: (actor.photo_url as string | null) ?? null,
          }
        : null,
    };
    return {
      id: n.id as string,
      readAt: (n.read_at as string | null) ?? null,
      createdAt: n.created_at as string,
      like,
    };
  });
  const unread = items.filter((i) => !i.readAt).length;

  async function markAll() {
    "use server";
    await markAllNotificationsRead();
    revalidatePath("/notifications");
  }

  return (
    <Section width="narrow">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div className="flex min-w-0 items-baseline gap-2.5">
          <h1 className="text-d2 truncate">{await tServer("Notifications")}</h1>
          {unread > 0 && (
            <span className="shrink-0 text-sm text-ink-muted">
              {unread} {await tServer("unread")}
            </span>
          )}
        </div>
        {unread > 0 && (
          <form action={markAll}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm text-ink border border-line hover:border-navy transition-colors rounded-full"
            >
              <Check className="w-3.5 h-3.5" />
              {await tServer("Mark all as read")}
            </button>
          </form>
        )}
      </div>

      <nav className="flex items-center gap-1 mb-8 border-b border-line">
        {(
          [
            ["all", "/notifications", await tServer("All")],
            [
              "meetups",
              "/notifications?tab=meetups",
              await tServer("Meetups"),
            ],
            [
              "connections",
              "/notifications?tab=connections",
              await tServer("Connections"),
            ],
          ] as const
        ).map(([key, href, label]) => (
          <Link
            key={key}
            href={href}
            className={`px-4 py-2 text-sm tracking-wide border-b-2 -mb-px transition-colors ${
              tab === key
                ? "border-navy text-navy font-medium"
                : "border-transparent text-ink-muted hover:text-navy"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title={await tServer("Nothing here yet")}
          description={await tServer(
            "Interest, replies, messages, and profile views land here as they happen.",
          )}
        />
      ) : (
        <Card padding="none" className="divide-y divide-line overflow-hidden">
          {items.map((i) => (
            <Link
              key={i.id}
              href={notifHref(i.like)}
              className={`flex items-center gap-3 p-4 transition-colors group ${
                i.readAt ? "hover:bg-cream" : "bg-gold-soft/50 hover:bg-gold-soft"
              }`}
            >
              {i.like.actor ? (
                <Avatar
                  name={i.like.actor.full_name}
                  url={i.like.actor.photo_url}
                  size="sm"
                />
              ) : (
                <span className="w-9 h-9 rounded-full bg-gold-soft grid place-items-center shrink-0">
                  <Bell className="w-4 h-4 text-gold-ink" />
                </span>
              )}
              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm truncate ${
                    i.readAt ? "text-ink" : "text-navy font-medium"
                  }`}
                >
                  {notifText(i.like, tr)}
                </span>
                <span className="block text-xs text-ink-muted mt-0.5">
                  {timeAgo(i.createdAt, locale)}
                </span>
              </span>
              {!i.readAt && (
                <span
                  className="w-2 h-2 rounded-full bg-navy shrink-0"
                  aria-hidden="true"
                />
              )}
              <ChevronRight className="w-4 h-4 shrink-0 text-ink-muted group-hover:text-navy transition-colors" />
            </Link>
          ))}
        </Card>
      )}
    </Section>
  );
}
