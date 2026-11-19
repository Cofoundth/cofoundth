"use client";

// A tablet asking for the desktop site — an iPad's Safari always does, and an
// Android tablet's Chrome does by default — sends a computer's user agent
// ("Macintosh", or "X11; Linux"). The browser can tell from the main pointer,
// so it sets the device cookie and reloads once to use the deck's touch gallery.
//
// RE-WRITTEN ON EVERY VISIT, not just the first: Safari caps a cookie set
// from script at seven days, so one written once would lapse every week.
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
