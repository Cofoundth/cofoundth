"use client";

// A tablet asking for the desktop site — an iPad's Safari always does, and an
// Android tablet's Chrome does by default — sends a computer's user agent
// ("Macintosh", or "X11; Linux"), so the server cannot tell it from a
// computer (lib/device.ts) and hides the phone-only products it can in fact
// run. The browser can tell: its main pointer is a finger. So on such a
// device this sets the cookie lib/device.ts reads, and reloads the page once.
//
// RE-WRITTEN ON EVERY VISIT, not just the first: Safari caps a cookie set
// from script at seven days, so one written once would lapse every week.
//
// A FULL RELOAD, not router.refresh(): when the server's first answer was a
// 404 — a phone-only product's page, read as a computer — a refresh does fetch
// the product, but Next keeps the not-found screen up (its boundary resets only
// when the path changes) and the visitor is left on an error. Measured,
// 2026-11-18.
//
// Reloads at most once: only when the cookie was missing AND it stuck, since a
// browser refusing cookies would otherwise reload forever. Renders nothing.
//
// And UNDONE on a device that is not a touch screen after all — a computer
// that once had touch emulation on in its developer tools, say — so it is not
// read as a tablet for the cookie's year: cleared, and reloaded once, the
// same way.

import { useEffect } from "react";

const COOKIE = "cofoundee_touch"; // lib/device.ts TOUCH_COOKIE
/** A computer's user agent that a tablet may borrow. A Chromebook says "X11;
 *  CrOS" and stays a computer. */
const DESKTOP_UA = /Macintosh|X11; Linux/;

function hasCookie(): boolean {
  return document.cookie.split("; ").some((c) => c === `${COOKIE}=1`);
}

export function TouchHint() {
  useEffect(() => {
    const ua = navigator.userAgent;
    if (!DESKTOP_UA.test(ua)) return;
    // A finger as the main pointer; an iPad with a keyboard's trackpad can
    // report a fine pointer, but a Mac never reports touch points.
    const touch =
      window.matchMedia("(pointer: coarse)").matches ||
      (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
    if (!touch) {
      if (hasCookie()) {
        document.cookie = `${COOKIE}=; path=/; max-age=0; samesite=lax`;
        if (!hasCookie()) window.location.reload();
      }
      return;
    }
    const had = hasCookie();
    document.cookie = `${COOKIE}=1; path=/; max-age=31536000; samesite=lax`;
    if (!had && hasCookie()) window.location.reload();
  }, []);
  return null;
}
