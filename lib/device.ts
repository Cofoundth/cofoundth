// Let the product deck choose its gallery for a computer or a touch device.
// TouchHint records when a tablet requests the desktop site.

import { cookies, headers } from "next/headers";

export type Viewer = "phone" | "computer" | "bot";

/** Set by components/TouchHint.tsx on a touch-screen device that sent a
 *  computer's user agent (an iPad, an Android tablet in desktop mode). */
export const TOUCH_COOKIE = "cofoundee_touch";

/** A computer's user agent that a tablet may borrow (TouchHint's test, kept
 *  the same). A Chromebook says "X11; CrOS" and stays a computer. */
const DESKTOP_UA = /macintosh|x11; linux/i;

/** Crawlers and link-preview fetchers use the single-image gallery. */
const BOT =
  /bot\b|bot\/|crawl|spider|slurp|facebookexternalhit|facebot|linespider|line-poker|whatsapp|telegram|discord|slack|embedly|pinterest|vkshare|skypeuripreview|google-inspectiontool|lighthouse|headlesschrome/i;

/** Phones and tablets that say so. */
const PHONE =
  /android|iphone|ipad|ipod|mobile|silk|kindle|blackberry|bb10|iemobile|opera mini|webos/i;

export async function viewerKind(): Promise<Viewer> {
  const h = await headers();
  const ua = h.get("user-agent") ?? "";
  // A request without a user agent can use the same gallery as a crawler.
  if (!ua || BOT.test(ua)) return "bot";
  if (h.get("sec-ch-ua-mobile") === "?1" || PHONE.test(ua)) return "phone";
  if (DESKTOP_UA.test(ua) && (await cookies()).get(TOUCH_COOKIE)?.value === "1") {
    return "phone";
  }
  return "computer";
}
