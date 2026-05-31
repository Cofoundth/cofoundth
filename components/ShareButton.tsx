"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useT } from "@/lib/i18n-client";

// Copies (or natively shares) a link. Pass a relative `path` (resolved against
// the current origin) or nothing to share the current page.
export function ShareButton({
  path,
  className,
}: {
  path?: string;
  className?: string;
}) {
  const tr = useT();
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url =
      typeof window !== "undefined"
        ? path
          ? `${window.location.origin}${path}`
          : window.location.href
        : (path ?? "");
    try {
      if (navigator.share) {
        await navigator.share({ url });
        return;
      }
    } catch {
      // user cancelled native share — fall through to clipboard
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — no-op
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
