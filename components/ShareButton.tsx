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
    // fall through to legacy path
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

// Copies (or, on touch devices, natively shares) a link. Pass a relative `path`
// (resolved against the current origin) or nothing to share the current page.
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

    // Native share only on touch devices (great for LINE/Messenger on mobile).
    // On desktop the share sheet is inconsistent, so just copy — predictable
    // and always gives "Copied" feedback.
    const isTouch =
      typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    if (isTouch && navigator.share) {
      try {
        await navigator.share({ url });
        return;
      } catch {
        // cancelled or failed — fall through to clipboard copy
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
