import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Keep the authenticated app + auth flows out of the index.
        disallow: [
          "/dashboard",
          "/onboarding",
          "/interests",
          "/matches",
          "/messages",
          "/admin",
          "/auth",
          "/login",
          "/signup",
          "/forgot-password",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
