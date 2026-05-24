// Insights (blog) repository — DB-backed via `insights` table.
//
// Public read uses the standard client (RLS only exposes published rows).
// Admin writes use the service-role admin client; callers MUST validate
// isAdminEmail() before calling any of the mutating helpers below.

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Locale } from "@/lib/i18n";

export type InsightStatus = "draft" | "published";

export type Insight = {
  id: string;
  slug: string;
  locale: Locale;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  reading_time: number;
  status: InsightStatus;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

// ---- Public reads ---------------------------------------------------

export async function listInsights(locale: Locale): Promise<Insight[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[insights.list] query failed", error);
    return [];
  }
  return collapseByLocale((data ?? []) as Insight[], locale);
}

export async function getInsightBySlug(
  slug: string,
  locale: Locale,
): Promise<Insight | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("insights")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published");

  if (error || !data?.length) return null;
  return pickLocale(data as Insight[], locale);
}

export async function listAllSlugsForStaticParams(): Promise<string[]> {
  // Runs in `generateStaticParams` — no request context, so the cookie-based
  // server client can't be used. Service-role admin client works statelessly.
  const { data } = await createAdminClient()
    .from("insights")
    .select("slug")
    .eq("status", "published");
  const slugs = new Set<string>();
  (data ?? []).forEach((r) => slugs.add(r.slug as string));
  return Array.from(slugs);
}

// ---- Admin reads / writes ------------------------------------------
// Caller MUST verify isAdminEmail() before invoking any of these.

export async function adminListAll(): Promise<Insight[]> {
  const { data, error } = await createAdminClient()
    .from("insights")
    .select("*")
    .order("updated_at", { ascending: false });
  if (error) {
    console.error("[insights.admin.list] failed", error);
    return [];
  }
  return (data ?? []) as Insight[];
}

export async function adminGetById(id: string): Promise<Insight | null> {
  const { data } = await createAdminClient()
    .from("insights")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Insight | null) ?? null;
}

export type InsightInput = {
  slug: string;
  locale: Locale;
  title: string;
  excerpt: string;
  body: string;
  category: string;
  reading_time: number;
  status: InsightStatus;
  author_id?: string | null;
};

export async function adminCreate(input: InsightInput): Promise<{ id: string } | { error: string }> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("insights")
    .insert({
      ...input,
      published_at: input.status === "published" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();
  if (error) return { error: error.message };
  return { id: data.id as string };
}

export async function adminUpdate(
  id: string,
  input: Partial<InsightInput>,
): Promise<{ ok: true } | { error: string }> {
  const admin = createAdminClient();
  const patch: Record<string, unknown> = { ...input };
  if (input.status === "published") {
    // Set published_at if transitioning to published and not already set.
    const existing = await adminGetById(id);
    if (existing && !existing.published_at) {
      patch.published_at = new Date().toISOString();
    }
  } else if (input.status === "draft") {
    patch.published_at = null;
  }
  const { error } = await admin.from("insights").update(patch).eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

export async function adminDelete(id: string): Promise<{ ok: true } | { error: string }> {
  const { error } = await createAdminClient().from("insights").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

// ---- Helpers --------------------------------------------------------

// When listing for a locale, prefer matching-locale rows; for slugs only
// available in 'en', fall back to those. Each slug appears at most once.
function collapseByLocale(rows: Insight[], locale: Locale): Insight[] {
  const bySlug = new Map<string, Insight>();
  for (const row of rows) {
    const existing = bySlug.get(row.slug);
    if (!existing) {
      bySlug.set(row.slug, row);
      continue;
    }
    // Prefer the locale match; otherwise keep whichever was published first.
    if (row.locale === locale && existing.locale !== locale) {
      bySlug.set(row.slug, row);
    }
  }
  return Array.from(bySlug.values()).sort((a, b) => {
    const ta = a.published_at ? Date.parse(a.published_at) : 0;
    const tb = b.published_at ? Date.parse(b.published_at) : 0;
    return tb - ta;
  });
}

function pickLocale(rows: Insight[], locale: Locale): Insight | null {
  const match = rows.find((r) => r.locale === locale);
  if (match) return match;
  return rows.find((r) => r.locale === "en") ?? rows[0] ?? null;
}
