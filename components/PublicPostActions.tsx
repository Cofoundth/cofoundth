"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, MessageCircle, UserPlus, X } from "lucide-react";
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-5 text-sm">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 text-ink-muted hover:text-gold transition-colors"
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
          className="inline-flex items-center gap-1.5 text-navy hover:text-gold transition-colors ml-auto"
        >
          <UserPlus className="w-4 h-4" strokeWidth={1.5} />
          {tr("Connect")}
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-navy/40 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative bg-white border border-line max-w-sm w-full p-8 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 text-ink-muted hover:text-navy"
              aria-label={tr("Close")}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
              Cofoundee
            </div>
            <h3 className="font-serif text-2xl text-navy mb-2">
              {tr("Join the community")}
            </h3>
            <p className="text-sm text-ink-muted leading-relaxed mb-6">
              {tr(
                "Sign in or create your founder profile to like, comment, and connect.",
              )}
            </p>
            <div className="space-y-3">
              <Link
                href="/signup"
                className="block bg-navy hover:bg-navy-dark text-white py-3 text-sm tracking-wide transition-colors"
              >
                {tr("Create your profile")}
              </Link>
              <Link
                href="/login"
                className="block border border-line hover:border-navy text-ink hover:text-navy py-3 text-sm tracking-wide transition-colors"
              >
                {tr("Sign in")}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
