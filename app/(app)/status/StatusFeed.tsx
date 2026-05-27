"use client";

import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { ExternalLink, Heart, Sparkles, Trash2, Trophy } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { deleteStatusAction, toggleStatusLikeAction } from "./actions";

export type StatusKind = "status" | "milestone" | "show_and_tell";

export type StatusItem = {
  id: string;
  content: string;
  kind: StatusKind;
  link_url: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    photo_url: string | null;
    slug: string | null;
  } | null;
  isOwn: boolean;
  likeCount: number;
  myLike: boolean;
};

type Props = {
  items: StatusItem[];
  locale: "en" | "th";
  emptyMessage?: string;
};

function timeAgo(iso: string, locale: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (locale === "th") {
    if (m < 1) return "เมื่อสักครู่";
    if (m < 60) return `${m} นาทีที่แล้ว`;
    if (h < 24) return `${h} ชั่วโมงที่แล้ว`;
    if (d < 7) return `${d} วันที่แล้ว`;
    return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "short" });
  }
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

const KIND_META: Record<StatusKind, { icon: typeof Sparkles; en: string; th: string; tone: string; bg: string }> = {
  status: {
    icon: Sparkles,
    en: "working on",
    th: "กำลังทำ",
    tone: "text-ink-muted",
    bg: "",
  },
  milestone: {
    icon: Trophy,
    en: "hit a milestone",
    th: "ประสบความสำเร็จ",
    tone: "text-gold",
    bg: "bg-gold/5",
  },
  show_and_tell: {
    icon: ExternalLink,
    en: "shipped",
    th: "เพิ่งปล่อย",
    tone: "text-navy",
    bg: "bg-cream",
  },
};

export function StatusFeed({ items, locale, emptyMessage }: Props) {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-line p-6 text-center text-sm text-ink-muted">
        {emptyMessage ??
          (locale === "th"
            ? "ยังไม่มีอัปเดต — เป็นคนแรก"
            : "No updates yet — be the first.")}
      </div>
    );
  }

  return (
    <div className="bg-white border border-line divide-y divide-line">
      {items.map((item) => (
        <StatusRow key={item.id} item={item} locale={locale} />
      ))}
    </div>
  );
}

function StatusRow({ item, locale }: { item: StatusItem; locale: "en" | "th" }) {
  const [optimistic, setOptimistic] = useOptimistic(
    { count: item.likeCount, liked: item.myLike },
    (state) => ({
      count: state.liked ? state.count - 1 : state.count + 1,
      liked: !state.liked,
    }),
  );
  const [, startTransition] = useTransition();
  const meta = KIND_META[item.kind];
  const Icon = meta.icon;
  const authorHref = item.author
    ? `/profile/${item.author.slug ?? item.author.id}`
    : "#";
  const fresh = Date.now() - new Date(item.created_at).getTime() < 3 * 3600_000;

  return (
    <div className={`p-4 flex items-start gap-3 ${meta.bg}`}>
      <Link href={authorHref} className="shrink-0">
        <Avatar
          name={item.author?.full_name}
          url={item.author?.photo_url}
          size="sm"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3 mb-1">
          <div className="text-xs flex items-center gap-2 flex-wrap min-w-0">
            <Link
              href={authorHref}
              className="text-navy font-medium truncate hover:text-gold"
            >
              {item.author?.full_name ?? "A founder"}
            </Link>
            <span className={`inline-flex items-center gap-1 ${meta.tone}`}>
              <Icon className="w-3 h-3" strokeWidth={1.5} />
              <span className="text-ink-muted">
                {locale === "th" ? meta.th : meta.en}
              </span>
            </span>
            <span className="text-ink-muted">·</span>
            <span className="text-ink-muted">
              {timeAgo(item.created_at, locale)}
            </span>
            {fresh && (
              <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
            )}
          </div>
          {item.isOwn && (
            <button
              type="button"
              onClick={() => {
                startTransition(async () => {
                  await deleteStatusAction(item.id);
                });
              }}
              className="text-ink-muted hover:text-red-700 shrink-0"
              aria-label={locale === "th" ? "ลบ" : "Delete"}
              title={locale === "th" ? "ลบ" : "Delete"}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap">
          {item.content}
        </p>
        {item.link_url && (
          <a
            href={item.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-navy hover:text-gold underline underline-offset-4 decoration-gold/30 break-all"
          >
            <ExternalLink className="w-3 h-3" />
            {(() => {
              try {
                return new URL(item.link_url).hostname.replace(/^www\./, "");
              } catch {
                return item.link_url;
              }
            })()}
          </a>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs">
          <button
            type="button"
            onClick={() => {
              startTransition(async () => {
                setOptimistic(null);
                await toggleStatusLikeAction(item.id);
              });
            }}
            className={`inline-flex items-center gap-1 transition-colors ${
              optimistic.liked
                ? "text-gold"
                : "text-ink-muted hover:text-navy"
            }`}
          >
            <Heart
              className="w-3.5 h-3.5"
              strokeWidth={1.5}
              fill={optimistic.liked ? "currentColor" : "none"}
            />
            <span className="tabular-nums">{optimistic.count}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
