import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";

export const revalidate = 3600; // refresh sitemap hourly

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/browse",
    "/insights",
    "/events",
    "/legal-templates",
    "/code-of-conduct",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  // Published insights (best-effort — sitemap should never crash the build)
  let insightRoutes: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("insights")
      .select("slug, updated_at")
      .eq("status", "published");
    const seen = new Set<string>();
    insightRoutes = (data ?? [])
      .filter((i) => {
        const s = i.slug as string;
        if (seen.has(s)) return false;
        seen.add(s);
        return true;
      })
      .map((i) => ({
        url: `${SITE_URL}/insights/${i.slug}`,
        lastModified: i.updated_at
          ? new Date(i.updated_at as string)
          : new Date(),
        changeFrequency: "monthly" as const,
        priority: 0.6,
      }));
  } catch {
    // Env not available at build time — ship static routes only.
  }

  return [...staticRoutes, ...insightRoutes];
}
