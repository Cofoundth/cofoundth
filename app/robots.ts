import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // ── The disallow list is the COMPLEMENT of app/sitemap.ts ──────────
        // Everything here is behind the (app) layout's requireUser redirect,
        // or is an auth/dev endpoint. A crawler only collects 307s on these,
        // so this is crawl-budget hygiene, not a security control — the gate
        // is the layout, never this file.
        //
        // The two rules to keep in mind when editing:
        //   1. These are PREFIX matches. "/p" would block every product page
        //      and "/pro…" would block the shelf, so NEVER add a bare "/p".
        //   2. Nothing public may appear here. /products, /p/<id>, /founders,
        //      /insights, /about, /contact, /privacy, /terms,
        //      /legal-templates and /code-of-conduct are all deliberately
        //      absent. /products in particular is now a PUBLIC marketing
        //      route (it moved out of app/(app)) and is the same shelf / can
        //      serve — adding it here would undo the whole feature.
        disallow: [
          "/activity",
          "/admin",
          "/browse",
          "/community",
          "/companies",
          "/funding",
          "/interests",
          "/investor",
          "/matches",
          "/meetups",
          "/messages",
          "/notifications",
          "/onboarding",
          "/orgs",
          "/profile",
          "/settings",
          // Auth + dev endpoints — nothing to index, and /dev/login is a
          // local-only passwordless shortcut that must never be crawled.
          "/auth",
          "/dev",
          "/forgot-password",
          "/login",
          "/signup",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
