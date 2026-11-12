"use client";

// A phone app, opened from a computer: a code to scan instead of a store page.
//
// THE PROBLEM (the owner, 2026-11-12): "if you are a desktop user and it opens
// the App Store, it's bad UX". Pressing "Try" on a phone app from a laptop
// landed on an App Store page in a new tab, where there is nothing to try. So
// when the product only runs on a phone (`phones`, worked out on the server:
// ./product-view.ts storePlatformOf) and this device is NOT a phone or a
// tablet, "Try" opens this dialog instead: a QR code of the same link, which a
// phone's camera opens in one step, and a plain way to open the link here
// anyway.
//
// Decided at the moment of the press, in the browser, because only the browser
// knows what it is running on — never during render, so the server's markup
// and the first client render stay identical.
//
// The QR is drawn as ONE <path> from uqr's module matrix (a pure function, no
// DOM, no network): nothing third-party is fetched and no HTML string is
// injected. Navy on white with a quiet zone, so any phone camera reads it.

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { encode } from "uqr";
import { useT } from "@/lib/i18n-client";
import { Dialog } from "@/components/ui";
import type { PhonePlatform } from "./product-view";

/** Every link out to a maker's site. ./product-view.ts says why each word. */
const LINK_REL = "noopener noreferrer nofollow";

/** The phone OS this browser is running on, or null on anything else. */
function phoneOS(): PhonePlatform | null {
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  // iPadOS 13+ asks for the desktop site and says "Macintosh"; a Mac has no
  // touch screen, an iPad does.
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return "ios";
  return null;
}

/**
 * Whether pressing "Try" here should show the code instead of opening the
 * link: the product only runs on a phone, and this is not one. A phone of the
 * other kind gets the link as before (a QR code on the screen you would scan it
 * with is no use), and a product that runs anywhere else always does.
 */
export function needsPhone(phones: readonly PhonePlatform[]): boolean {
  return phones.length > 0 && phoneOS() === null;
}

/** A plain primary click. A middle-click or a modifier is the reader asking
 *  the browser for a tab or a window, and gets one. */
function isPlainClick(event: MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

/**
 * The product page's "Try it" (./ProductDetail.tsx, a server component): the
 * same external link, plus the handoff for a phone app pressed on a computer.
 * Every other press is the link's own, so it still works before hydration.
 */
export function TryItLink({
  href,
  host,
  name,
  phones,
  describedBy,
  className,
  children,
}: {
  href: string;
  host: string;
  name: string;
  phones: readonly PhonePlatform[];
  describedBy?: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <a
        href={href}
        target="_blank"
        rel={LINK_REL}
        aria-describedby={describedBy}
        className={className}
        onClick={(event) => {
          if (isPlainClick(event) && needsPhone(phones)) {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        {children}
      </a>
      {open && (
        <PhoneHandoffDialog
          name={name}
          href={href}
          host={host}
          phones={phones}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

const PHONE_NAME: Record<PhonePlatform, string> = {
  ios: "iPhone",
  android: "Android",
};

function QrCode({ value, label }: { value: string; label: string }) {
  const { size, path } = useMemo(() => {
    const qr = encode(value, { ecc: "M", border: 2 });
    let d = "";
    qr.data.forEach((row, y) =>
      row.forEach((dark, x) => {
        if (dark) d += `M${x} ${y}h1v1h-1z`;
      }),
    );
    return { size: qr.size, path: d };
  }, [value]);
  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className="mx-auto h-48 w-48 rounded-xl bg-white"
    >
      <path d={path} className="fill-navy" />
    </svg>
  );
}

export function PhoneHandoffDialog({
  name,
  href,
  host,
  phones,
  onClose,
  onOpenHere,
}: {
  name: string;
  /** Already through webUrl() on the server. */
  href: string;
  host: string;
  phones: readonly PhonePlatform[];
  onClose: () => void;
  /** The reader chose the link on this device after all. */
  onOpenHere?: () => void;
}) {
  const tr = useT();
  const platforms =
    phones.length > 1
      ? tr("{a} and {b}")
          .replace("{a}", PHONE_NAME[phones[0]])
          .replace("{b}", PHONE_NAME[phones[1]])
      : PHONE_NAME[phones[0]];

  return (
    <Dialog
      onClose={onClose}
      labelledBy="phone-handoff-title"
      size="sm"
      closeButton="overlay"
      closeLabel={tr("Close")}
      panelClassName="text-center"
    >
      <h2 id="phone-handoff-title" className="text-lg font-bold tracking-normal">
        {tr("Open {name} on your phone").replace("{name}", name)}
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        {tr(
          "It's an app for {platforms}. Scan this code with your phone's camera to open it.",
        ).replace("{platforms}", platforms)}
      </p>
      <div className="mt-5">
        <QrCode
          value={href}
          label={tr("QR code to open {name}").replace("{name}", name)}
        />
      </div>
      <a
        href={href}
        target="_blank"
        rel={LINK_REL}
        onClick={() => {
          onOpenHere?.();
          onClose();
        }}
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-navy"
      >
        {tr("Open {host} here instead").replace("{host}", host)}
        <ExternalLink className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
      </a>
    </Dialog>
  );
}
