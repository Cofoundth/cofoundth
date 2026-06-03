"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

// Copy link on desktop; native share sheet on touch devices (which already
// lists LINE / Facebook / etc. — the smooth path on mobile). No third-party
// share-intent pages (those just hit login walls).
export function ShareButton({
  path,
  title,
  className,
}: {
  path?: string;
  title?: string;
  className?: string;
}) {
  const tr = useT();
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url =
      typeof window === "undefined"
        ? (path ?? "")
        : path
          ? `${window.location.origin}${path}`
          : window.location.href;

    const isTouch =
      typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    if (isTouch && navigator.share) {
      try {
        await navigator.share({ url, title: title || undefined });
        return;
      } catch {
        // cancelled / failed — fall through to clipboard
      }
    }

    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  return (
    <button
      type="button"
      onClick={onShare}
      className={
        className ??
        "inline-flex items-center gap-1 text-ink-muted hover:text-navy transition-colors"
      }
      aria-label={tr("Share")}
    >
      {copied ? (
        <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
      ) : (
        <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
      )}
      <span>{copied ? tr("Copied") : tr("Share")}</span>
    </button>
  );
}
