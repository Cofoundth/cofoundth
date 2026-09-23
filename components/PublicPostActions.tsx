"use client";

import { useId, useState } from "react";
import { Heart, MessageCircle, UserPlus, X } from "lucide-react";
import { Dialog, LinkButton } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

// Read-only like/comment/connect buttons for the public (logged-out) post page.
// Any interaction opens a join/sign-in modal — LinkedIn-style.
export function PublicPostActions({
  likeCount,
  commentCount,
}: {
  likeCount: number;
  commentCount: number;
}) {
  const tr = useT();
  const titleId = useId();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-5 text-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-ink-muted hover:text-gold-ink transition-colors"
        >
          <Heart className="w-4 h-4" strokeWidth={1.5} />
          <span className="tabular-nums">{likeCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-ink-muted hover:text-navy transition-colors"
        >
          <MessageCircle className="w-4 h-4" strokeWidth={1.5} />
          <span className="tabular-nums">{commentCount}</span>
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-navy hover:text-gold-ink transition-colors ml-auto"
        >
          <UserPlus className="w-4 h-4" strokeWidth={1.5} />
          {tr("Connect")}
        </button>
      </div>

      {open && (
        // `surface="card"` holds today's 24px borderless panel; Dialog's own
        // default is the overlay treatment (decision D1). The close button
        // stays hand-rolled: Dialog's `closeButton="overlay"` is the meetup
        // dialog's chunkier affordance (a 32px white disc), and swapping this
        // bare glyph for it would be a visible change nobody asked for.
        <Dialog
          onClose={() => setOpen(false)}
          labelledBy={titleId}
          size="sm"
          padding="lg"
          surface="card"
          panelClassName="text-center"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 text-ink-muted hover:text-navy"
            aria-label={tr("Close")}
          >
            <X className="w-4 h-4" />
          </button>
          <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3">
            Cofoundee
          </div>
          <h3 id={titleId} className="text-2xl mb-2">
            {tr("Join the community")}
          </h3>
          <p className="text-sm text-ink-muted leading-relaxed mb-6">
            {tr(
              "Sign in or create your founder profile to like, comment, and connect.",
            )}
          </p>
          {/* `px-0`: both buttons are full-width with centred labels, so the
              scale's horizontal pad only narrows the line box. Drop the
              override if the canonical inner padding is wanted — it has no
              visual effect here either way. */}
          <div className="space-y-3">
            <LinkButton href="/signup" fullWidth className="px-0">
              {tr("Create your profile")}
            </LinkButton>
            <LinkButton
              href="/login"
              variant="secondary"
              fullWidth
              className="px-0"
            >
              {tr("Sign in")}
            </LinkButton>
          </div>
        </Dialog>
      )}
    </>
  );
}
