"use client";

import Link from "next/link";
import { useId, useState, type MouseEvent } from "react";
import { ChevronRight } from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button, Dialog, LinkButton } from "@/components/ui";
import { authHref } from "@/lib/auth-href";
import { useT } from "@/lib/i18n-client";

export function ProductMaker({
  name,
  photoUrl,
  shippedAt,
  profileHref,
  signedIn,
}: {
  name: string;
  photoUrl: string | null;
  shippedAt: string;
  profileHref?: string;
  signedIn: boolean;
}) {
  const tr = useT();
  const titleId = useId();
  const [open, setOpen] = useState(false);
  const signInHref = profileHref && !signedIn ? authHref("/login", profileHref) : null;

  function openPrompt(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    // A touch tap may leave focus elsewhere. The dialog restores its opener.
    event.currentTarget.focus({ preventScroll: true });
    setOpen(true);
  }

  const byline = (
    <>
      <div className="shrink-0" aria-hidden="true">
        <Avatar name={name} url={photoUrl} size="sm" />
      </div>
      <span className="min-w-0 flex-1 wrap-anywhere text-sm text-ink-muted">
        <span className="font-medium text-navy underline-offset-4 group-hover/maker:underline">
          {name}
        </span>
        {" · "}
        {tr("shipped")}
        {" · "}
        {shippedAt}
      </span>
    </>
  );

  if (!profileHref) return <div className="flex items-center gap-3">{byline}</div>;

  return (
    <>
      <Link
        href={signInHref ?? profileHref}
        prefetch={false}
        aria-label={`${tr("View profile")} · ${name}`}
        aria-haspopup={signInHref ? "dialog" : undefined}
        onClick={signInHref ? openPrompt : undefined}
        className="group/maker flex min-h-11 touch-manipulation items-center gap-3 rounded-xl"
      >
        {byline}
        <ChevronRight className="size-4 shrink-0 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
      </Link>
      {open && signInHref && (
        <Dialog onClose={() => setOpen(false)} labelledBy={titleId} size="sm">
          <h2 id={titleId} className="text-xl">{tr("Sign in to view this profile")}</h2>
          <p className="mt-2 wrap-anywhere text-sm text-ink-muted">
            {tr("You’ll go to {name}’s profile after signing in.").replace("{name}", () => name)}
          </p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <LinkButton href={signInHref} prefetch={false} className="min-h-11">
              {tr("Sign in")}
            </LinkButton>
            <Button variant="secondary" className="min-h-11" onClick={() => setOpen(false)}>
              {tr("Maybe later")}
            </Button>
          </div>
        </Dialog>
      )}
    </>
  );
}
