"use client";

import { useState } from "react";
import { Check, Link2, Share2 } from "lucide-react";
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

// Share to socials via plain share-intent URLs — no SDKs, no API keys.
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
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function resolveUrl() {
    if (typeof window === "undefined") return path ?? "";
    return path ? `${window.location.origin}${path}` : window.location.href;
  }

  async function onCopy() {
    const ok = await copyToClipboard(resolveUrl());
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
    setOpen(false);
  }

  function openSocial(network: "line" | "facebook" | "x") {
    const u = encodeURIComponent(resolveUrl());
    const t = encodeURIComponent(title ?? "Cofoundee");
    const href =
      network === "line"
        ? `https://social-plugins.line.me/lineit/share?url=${u}`
        : network === "facebook"
          ? `https://www.facebook.com/sharer/sharer.php?u=${u}`
          : `https://twitter.com/intent/tweet?url=${u}&text=${t}`;
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=540");
    setOpen(false);
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={
          className ??
          "inline-flex items-center gap-1 text-ink-muted hover:text-navy transition-colors"
        }
        aria-label={tr("Share")}
        aria-expanded={open}
      >
        {copied ? (
          <Check className="w-3.5 h-3.5" strokeWidth={1.5} />
        ) : (
          <Share2 className="w-3.5 h-3.5" strokeWidth={1.5} />
        )}
        <span>{copied ? tr("Copied") : tr("Share")}</span>
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label={tr("Close")}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-full mt-2 z-50 w-44 bg-white border border-line shadow-lg py-1 text-sm">
            <button
              type="button"
              onClick={onCopy}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-ink hover:bg-cream text-left"
            >
              <Link2 className="w-4 h-4 text-ink-muted" strokeWidth={1.5} />
              {tr("Copy link")}
            </button>
            <button
              type="button"
              onClick={() => openSocial("line")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-ink hover:bg-cream text-left"
            >
              <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#06C755" }}>
                L
              </span>
              LINE
            </button>
            <button
              type="button"
              onClick={() => openSocial("facebook")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-ink hover:bg-cream text-left"
            >
              <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[9px] font-bold text-white" style={{ background: "#1877F2" }}>
                f
              </span>
              Facebook
            </button>
            <button
              type="button"
              onClick={() => openSocial("x")}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-ink hover:bg-cream text-left"
            >
              <span className="w-4 h-4 rounded-full inline-flex items-center justify-center text-[10px] font-bold text-white bg-navy">
                𝕏
              </span>
              X
            </button>
          </div>
        </>
      )}
    </div>
  );
}
