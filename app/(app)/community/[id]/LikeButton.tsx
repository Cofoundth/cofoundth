"use client";

import { useOptimistic, useTransition } from "react";
import { Heart } from "lucide-react";
import { toggleLikeAction } from "./actions";

type Props = {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
};

export function LikeButton({ postId, initialCount, initialLiked }: Props) {
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
      className={`inline-flex items-center gap-2 px-4 py-2 border transition-colors ${
        optimistic.liked
          ? "border-gold text-gold bg-gold/5"
          : "border-line text-ink-muted hover:border-navy hover:text-navy"
      } disabled:opacity-60`}
      aria-pressed={optimistic.liked}
      aria-label={optimistic.liked ? "Unlike" : "Like"}
    >
      <Heart
        className="w-4 h-4"
        fill={optimistic.liked ? "currentColor" : "none"}
        strokeWidth={1.5}
      />
      <span className="text-sm font-medium tabular-nums">
        {optimistic.count}
      </span>
    </button>
  );
}
