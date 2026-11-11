"use client";

import { useId, useState } from "react";
import { Heart, MessageCircle, Star, UserPlus, X } from "lucide-react";
import { Dialog, LinkButton } from "@/components/ui";
import { authHref } from "@/lib/auth-href";
import { useT } from "@/lib/i18n-client";

// Read-only like/comment/connect buttons for the public (logged-out) post page.
// Any interaction opens a join/sign-in modal — LinkedIn-style.
export function PublicPostActions({
  likeCount,
  commentCount,
  next,
}: {
  likeCount: number;
  commentCount: number;
  /** Where signing in from here lands the reader: this post's own page, with
   *  the deck context it came with. */
  next: string;
}) {
  const tr = useT();
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

      {open && <JoinDialog onClose={() => setOpen(false)} next={next} />}
    </>
  );
}

/**
 * "Sign in to rate", for a logged-out visitor on a product's public page. The
 * rating itself is <ProductRatingSummary>, rendered beside this by the page;
 * this is only the door, and it is the SAME join dialog as every other
 * interaction on that page — with a sentence that names what they tried to do.
 * Rating happens at /community/<id>, where /p/<id> sends a signed-in member,
 * which is why `next` is the product's /p/<id> (with the deck context it came
 * with, so its back link still finds the card) and not a second copy of that
 * decision.
 */
export function PublicRateButton({ next }: { next: string }) {
  const tr = useT();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 py-1.5 text-navy underline decoration-line underline-offset-4 hover:text-gold-ink transition-colors"
      >
        <Star className="w-4 h-4" strokeWidth={1.5} aria-hidden="true" />
        {tr("Sign in to rate")}
      </button>
      {open && (
        <JoinDialog
          onClose={() => setOpen(false)}
          next={next}
          body={tr("Sign in or create your profile to rate this product.")}
        />
      )}
    </>
  );
}

/** The join/sign-in modal every logged-out interaction on /p/<id> opens. */
function JoinDialog({
  onClose,
  body,
  next,
}: {
  onClose: () => void;
  /** Already translated. Defaults to the like/comment/connect sentence. */
  body?: string;
  /** Where either button lands the reader once they are in. */
  next: string;
}) {
  const tr = useT();
  const titleId = useId();

  return (
    // `surface="card"` holds today's 24px borderless panel; Dialog's own
    // default is the overlay treatment (decision D1). The close button
    // stays hand-rolled: Dialog's `closeButton="overlay"` is the meetup
    // dialog's chunkier affordance (a 32px white disc), and swapping this
    // bare glyph for it would be a visible change nobody asked for.
    <Dialog
      onClose={onClose}
      labelledBy={titleId}
      size="sm"
      padding="lg"
      surface="card"
      panelClassName="text-center"
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute top-3 right-3 text-ink-muted hover:text-navy"
        aria-label={tr("Close")}
      >
        <X className="w-4 h-4" />
      </button>
      <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3">
        Cofoundee
      </div>
      {/* The card-title register (20px, <h3>). It was text-2xl, which
          CLAUDE.md bans for text: 24 is not a register step. */}
      <h3 id={titleId} className="text-xl mb-2">
        {tr("Join the community")}
      </h3>
      <p className="text-sm text-ink-muted leading-relaxed mb-6">
        {body ??
          tr(
            "Sign in or create your founder profile to like, comment, and connect.",
          )}
      </p>
      {/* `px-0`: both buttons are full-width with centred labels, so the
          scale's horizontal pad only narrows the line box. Drop the
          override if the canonical inner padding is wanted — it has no
          visual effect here either way. */}
      <div className="space-y-3">
        <LinkButton
          href={authHref("/signup", next)}
          fullWidth
          className="px-0"
        >
          {tr("Create your profile")}
        </LinkButton>
        <LinkButton
          href={authHref("/login", next)}
          variant="secondary"
          fullWidth
          className="px-0"
        >
          {tr("Sign in")}
        </LinkButton>
      </div>
    </Dialog>
  );
}
