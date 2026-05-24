"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import {
  adminCreate,
  adminDelete,
  adminUpdate,
  type InsightInput,
  type InsightStatus,
} from "@/lib/insights";
import type { Locale } from "@/lib/i18n";

export type AdminFormState = { error: string } | undefined;

async function requireAdmin(): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!isAdminEmail(data.user?.email)) {
    throw new Error("Forbidden");
  }
  return data.user!.id;
}

function parseInput(formData: FormData): InsightInput | { error: string } {
  const slug = (formData.get("slug") as string | null)?.trim() ?? "";
  const locale = (formData.get("locale") as string | null)?.trim() ?? "en";
  const title = (formData.get("title") as string | null)?.trim() ?? "";
  const excerpt = (formData.get("excerpt") as string | null)?.trim() ?? "";
  const body = (formData.get("body") as string | null)?.trim() ?? "";
  const category = (formData.get("category") as string | null)?.trim() ?? "";
  const readingTimeRaw = formData.get("reading_time") as string | null;
  const status = (formData.get("status") as string | null) ?? "draft";

  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { error: "Slug must be lowercase letters/digits separated by hyphens." };
  }
  if (!["en", "th"].includes(locale)) return { error: "Locale must be en or th." };
  if (title.length < 1 || title.length > 200) return { error: "Title 1–200 chars." };
  if (excerpt.length < 1 || excerpt.length > 500) return { error: "Excerpt 1–500 chars." };
  if (body.length < 1 || body.length > 50000) return { error: "Body 1–50000 chars." };
  if (!category) return { error: "Category required." };
  if (!["draft", "published"].includes(status)) return { error: "Bad status." };

  const reading_time = Math.max(
    1,
    Math.min(120, parseInt(readingTimeRaw ?? "5", 10) || 5),
  );

  return {
    slug,
    locale: locale as Locale,
    title,
    excerpt,
    body,
    category,
    reading_time,
    status: status as InsightStatus,
  };
}

export async function createInsightAction(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const authorId = await requireAdmin();
  const parsed = parseInput(formData);
  if ("error" in parsed) return { error: parsed.error };
  const result = await adminCreate({ ...parsed, author_id: authorId });
  if ("error" in result) return { error: result.error };
  revalidatePath("/insights");
  revalidatePath(`/insights/${parsed.slug}`);
  revalidatePath("/admin/insights");
  redirect("/admin/insights");
}

export async function updateInsightAction(
  id: string,
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  await requireAdmin();
  const parsed = parseInput(formData);
  if ("error" in parsed) return { error: parsed.error };
  const result = await adminUpdate(id, parsed);
  if ("error" in result) return { error: result.error };
  revalidatePath("/insights");
  revalidatePath(`/insights/${parsed.slug}`);
  revalidatePath("/admin/insights");
  redirect("/admin/insights");
}

export async function deleteInsightAction(id: string, slug: string) {
  await requireAdmin();
  const result = await adminDelete(id);
  if ("error" in result) {
    console.error("[admin.insights.delete]", result.error);
    return;
  }
  revalidatePath("/insights");
  revalidatePath(`/insights/${slug}`);
  revalidatePath("/admin/insights");
}

export async function togglePublishAction(
  id: string,
  slug: string,
  current: InsightStatus,
) {
  await requireAdmin();
  const next: InsightStatus = current === "published" ? "draft" : "published";
  const result = await adminUpdate(id, { status: next });
  if ("error" in result) {
    console.error("[admin.insights.toggle]", result.error);
    return;
  }
  revalidatePath("/insights");
  revalidatePath(`/insights/${slug}`);
  revalidatePath("/admin/insights");
}
