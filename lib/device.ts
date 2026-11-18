// Who is looking, for the one rule that depends on it: a product that only
// runs on a phone is never shown to a COMPUTER (the founder's call,
// 2026-11-18). Phones and tablets see it, and so do bots — a link preview in
// LINE or a search crawler is not a person at a computer, and hiding the
// product from them would strip every shared link of its card.
//
// Read from the request on the server, so the first paint is already right:
// no deck that loads and then drops a card. The one thing a request cannot
// tell is a tablet asking for the desktop site — an iPad's Safari always
// does, saying "Macintosh"; an Android tablet's Chrome does by default,
// saying "X11; Linux". components/TouchHint.tsx notices the touch screen in
// the browser, sets TOUCH_COOKIE and reloads once, and from then on the
// tablet reads as the tablet it is.
//
// Server-only: it reads headers(), so any page that calls it renders per
// request — the pages that do (the deck, a product's page, a profile) already
// do.

import { cookies, headers } from "next/headers";

export type Viewer = "phone" | "computer" | "bot";

/** Set by components/TouchHint.tsx on a touch-screen device that sent a
 *  computer's user agent (an iPad, an Android tablet in desktop mode). */
export const TOUCH_COOKIE = "cofoundee_touch";

/** A computer's user agent that a tablet may borrow (TouchHint's test, kept
 *  the same). A Chromebook says "X11; CrOS" and stays a computer. */
const DESKTOP_UA = /macintosh|x11; linux/i;

/** Crawlers and link-preview fetchers. Over-matching is the safe side: a
 *  false "bot" only shows a computer user a phone app it would have hidden. */
const BOT =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebot|linespider|line-poker|whatsapp|telegram|discord|slack|embedly|pinterest|vkshare|skypeuripreview|google-inspectiontool|lighthouse|headlesschrome/i;

/** Phones and tablets that say so. */
const PHONE =
  /android|iphone|ipad|ipod|mobile|silk|kindle|blackberry|bb10|iemobile|opera mini|webos/i;

export async function viewerKind(): Promise<Viewer> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  // No user agent at all is a script or a privacy tool, not a visitor whose
  // screen we know: shown everything, like a bot.
  if (!ua || BOT.test(ua)) return "bot";
  if (h.get("sec-ch-ua-mobile") === "?1" || PHONE.test(ua)) return "phone";
  if (DESKTOP_UA.test(ua) && (await cookies()).get(TOUCH_COOKIE)?.value === "1") {
    return "phone";
  }
  return "computer";
}
