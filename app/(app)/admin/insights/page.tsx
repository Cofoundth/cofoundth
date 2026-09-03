import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Edit3, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { tServer } from "@/lib/i18n-server";
import { AdminTabs } from "@/components/AdminTabs";
import { EmptyState, LinkButton, Section } from "@/components/ui";
import { adminListAll } from "@/lib/insights";
import { togglePublishAction, deleteInsightAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminInsightsPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, data.user))) notFound();

  const insights = await adminListAll();

  // Group by slug for a tidy bilingual view.
  const bySlug = new Map<string, typeof insights>();
  for (const i of insights) {
    const arr = bySlug.get(i.slug) ?? [];
    arr.push(i);
    bySlug.set(i.slug, arr);
  }

  return (
    <Section>
      <AdminTabs />
      <div className="mb-8 pb-8 border-b border-line flex items-end justify-between gap-4">
        <div className="max-w-[640px]">
          <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3">
            Admin
          </div>
          <h1 className="text-d2 mb-2">Insights</h1>
          <p className="text-ink">
            {insights.length} row{insights.length === 1 ? "" : "s"} across{" "}
            {bySlug.size} post{bySlug.size === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/admin/insights/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors rounded-full"
        >
          <Plus className="w-4 h-4" /> New insight
        </Link>
      </div>

      {bySlug.size === 0 ? (
        // KIND A — nothing written yet, and writing it is the admin's job, so
        // this one gets a real CTA. The old copy asked whether a migration had
        // been applied; that is a dev-time question, not an empty state.
        <EmptyState
          icon={FileText}
          title={await tServer("No insights yet")}
          description={await tServer(
            "Nothing is published, so the public Insights page is empty for every visitor.",
          )}
          action={
            <LinkButton href="/admin/insights/new">
              <Plus className="w-4 h-4" /> {await tServer("New insight")}
            </LinkButton>
          }
        />
      ) : (
        <div className="space-y-4">
          {Array.from(bySlug.entries()).map(([slug, rows]) => (
            <div key={slug} className="bg-white rounded-3xl shadow-xs overflow-hidden">
              <div className="px-5 py-3 border-b border-line bg-cream">
                <div className="text-xs uppercase tracking-[0.2em] text-ink-muted">
                  {slug}
                </div>
              </div>
              <div className="divide-y divide-line">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="px-5 py-4 flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-xs uppercase tracking-[0.2em] text-navy border border-line px-2 py-0.5 rounded-full">
                          {r.locale}
                        </span>
                        <span
                          className={`text-xs uppercase tracking-[0.2em] px-2 py-0.5 border rounded-full ${
                            r.status === "published"
                              ? "border-line text-gold-ink"
                              : "border-line text-ink-muted"
                          }`}
                        >
                          {r.status}
                        </span>
                        <span className="text-xs text-ink-muted">
                          {r.category} · {r.reading_time} min
                        </span>
                      </div>
                      <div className="text-base text-navy truncate">
                        {r.title}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <form
                        action={togglePublishAction.bind(
                          null,
                          r.id,
                          r.slug,
                          r.status,
                        )}
                      >
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 border border-line hover:border-navy text-ink hover:text-navy transition-colors rounded-full"
                        >
                          {r.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                      <Link
                        href={`/admin/insights/${r.id}/edit`}
                        className="text-xs px-3 py-1.5 border border-line hover:border-navy text-ink hover:text-navy transition-colors inline-flex items-center gap-1 rounded-full"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </Link>
                      <form
                        action={deleteInsightAction.bind(null, r.id, r.slug)}
                      >
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 border border-danger-line text-danger-ink hover:bg-danger-surface transition-colors rounded-full"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
