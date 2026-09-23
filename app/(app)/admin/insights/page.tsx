import { notFound } from "next/navigation";
import { Plus, Edit3, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { tServer } from "@/lib/i18n-server";
import { AdminTabs } from "@/components/AdminTabs";
import { Button, Card, EmptyState, LinkButton, Section } from "@/components/ui";
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
          <div className="flex min-w-0 items-baseline gap-2.5">
            <h1 className="text-d2 truncate">Insights</h1>
            <span className="shrink-0 text-sm text-ink-muted">
              {insights.length} row{insights.length === 1 ? "" : "s"} across{" "}
              {bySlug.size} post{bySlug.size === 1 ? "" : "s"}
            </span>
          </div>
        </div>
        <LinkButton href="/admin/insights/new" className="px-5 py-3">
          <Plus className="w-4 h-4" /> New insight
        </LinkButton>
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
            <Card key={slug} padding="none" className="overflow-hidden">
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
                        <Button type="submit" variant="secondary" size="xs">
                          {r.status === "published" ? "Unpublish" : "Publish"}
                        </Button>
                      </form>
                      <LinkButton
                        href={`/admin/insights/${r.id}/edit`}
                        variant="secondary"
                        size="xs"
                        className="gap-1"
                      >
                        <Edit3 className="w-3 h-3" /> Edit
                      </LinkButton>
                      <form
                        action={deleteInsightAction.bind(null, r.id, r.slug)}
                      >
                        <Button
                          type="submit"
                          variant="danger-outline"
                          size="xs"
                        >
                          Delete
                        </Button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Section>
  );
}
