"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { toggleLikeAction } from "./actions";

type Props = {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
};

// Reads exactly like the feed's like control (components/PostCard.tsx): no
// chrome, just heart + count, gold-ink once liked. It used to be a bordered
// chip, which made it the only button-looking thing in the post footer and made
// the plain comment count next to it look broken by comparison. Sizing (icon
// w-4, gap-2) matches the comment read-out beside it; the type scale is
// inherited from the footer row.
export function LikeButton({ postId, initialCount, initialLiked }: Props) {
  const tr = useT();
  const [optimistic, setOptimistic] = useOptimistic(
    { count: initialCount, liked: initialLiked },
    (state) => ({
      count: state.liked ? state.count - 1 : state.count + 1,
      liked: !state.liked,
    }),
  );
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          setOptimistic(null);
          await toggleLikeAction(postId);
        })
      }
      className={`inline-flex items-center gap-2 transition-colors disabled:opacity-60 ${
        optimistic.liked
          ? "text-gold-ink"
          : "text-ink-muted hover:text-navy"
      }`}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? tr("Unlike") : tr("Like")}
    >
      <Heart
        className="w-4 h-4"
        fill={optimistic.liked ? "currentColor" : "none"}
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <span className="tabular-nums">{optimistic.count}</span>
    </button>
  );
}
