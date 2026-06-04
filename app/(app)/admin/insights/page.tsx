import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Edit3 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { AdminTabs } from "@/components/AdminTabs";
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
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <AdminTabs />
      <div className="mb-10 pb-8 border-b border-line flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
            Admin
          </div>
          <h1 className="text-4xl mb-2">Insights</h1>
          <p className="text-ink">
            {insights.length} row{insights.length === 1 ? "" : "s"} across{" "}
            {bySlug.size} post{bySlug.size === 1 ? "" : "s"}.
          </p>
        </div>
        <Link
          href="/admin/insights/new"
          className="inline-flex items-center gap-2 px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
        >
          <Plus className="w-4 h-4" /> New insight
        </Link>
      </div>

      {bySlug.size === 0 ? (
        <div className="bg-white border border-line p-12 text-center">
          <h3 className="text-2xl mb-2">No insights yet</h3>
          <p className="text-ink-muted mb-6">
            Did you apply migration{" "}
            <code>0008_insights.sql</code>? Then create your first post.
          </p>
          <Link
            href="/admin/insights/new"
            className="inline-block px-6 py-3 bg-navy hover:bg-navy-dark text-white text-sm"
          >
            Create first insight
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {Array.from(bySlug.entries()).map(([slug, rows]) => (
            <div key={slug} className="bg-white border border-line">
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
                        <span className="text-[10px] uppercase tracking-[0.2em] text-navy border border-line px-2 py-0.5">
                          {r.locale}
                        </span>
                        <span
                          className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${
                            r.status === "published"
                              ? "border-gold text-gold"
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
                          className="text-xs px-3 py-1.5 border border-line hover:border-navy text-ink hover:text-navy transition-colors"
                        >
                          {r.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                      <Link
                        href={`/admin/insights/${r.id}/edit`}
                        className="text-xs px-3 py-1.5 border border-line hover:border-navy text-ink hover:text-navy transition-colors inline-flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </Link>
                      <form
                        action={deleteInsightAction.bind(null, r.id, r.slug)}
                      >
                        <button
                          type="submit"
                          className="text-xs px-3 py-1.5 border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
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
    </div>
  );
}
