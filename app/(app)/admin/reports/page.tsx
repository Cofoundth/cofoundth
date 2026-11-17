import Link from "next/link";
import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { AdminTabs } from "@/components/AdminTabs";
import { Card, EmptyState, Section } from "@/components/ui";
import { Paginated } from "@/components/Paginated";
import { ReportActions } from "./ReportActions";
import { tServer, getLocale } from "@/lib/i18n-server";
import { productPath } from "@/lib/post-types";
import { PRODUCT_KIND } from "@/lib/public-post";

/** Report kinds whose content "Remove content" deletes (moderateReportAction,
 *  lib/post-actions.ts). A product is kind "post". */
const REMOVABLE = new Set(["post", "comment", "message"]);

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!(await isAdminUser(supabase, user))) notFound();

  const KIND_LABEL: Record<string, string> = {
    profile: await tServer("Profile"),
    post: await tServer("Post"),
    comment: await tServer("Comment"),
    message: await tServer("Message"),
    meetup: await tServer("Meetup"),
  };
  const STATUS_LABEL: Record<string, string> = {
    open: await tServer("Open"),
    resolved: await tServer("Resolved"),
    dismissed: await tServer("Dismissed"),
  };
  const reporterLabel = await tServer("Reporter:");
  const targetLabel = await tServer("Target:");

  // Use the service-role client to bypass the reports RLS policy, which only
  // exposes rows to the reporter themselves. Admin auth was already verified
  // above via the allowlist, so this is safe.
  const admin = createAdminClient();
  const { data: reports, error } = await admin
    .from("reports")
    .select("id, target_kind, target_id, reason, status, created_at, reporter_id")
    .order("created_at", { ascending: false })
    .limit(200);

  // What each report points at: a snippet, so the admin can judge without
  // leaving the page, and a link to where it lives. A PRODUCT is reported as
  // kind "post" (it is a forum_posts row) and told apart by the row's own
  // kind; a comment links to the thread it sits in, on a post's page or a
  // product's. Messages get no link (a conversation is its two members'), and
  // deleted content has no row, so neither a snippet nor a link.
  const idsByKind = (kind: string) =>
    (reports ?? [])
      .filter((r) => r.target_kind === kind)
      .map((r) => r.target_id as string);
  type Row = Record<string, unknown>;
  const none = Promise.resolve({ data: [] as Row[] });
  const [{ data: rPosts }, { data: rComments }, { data: rMsgs }, { data: rMeetups }] =
    await Promise.all([
      idsByKind("post").length
        ? admin
            .from("forum_posts")
            .select("id, content, title, kind")
            .in("id", idsByKind("post"))
        : none,
      idsByKind("comment").length
        ? admin
            .from("forum_comments")
            .select("id, content, post_id")
            .in("id", idsByKind("comment"))
        : none,
      idsByKind("message").length
        ? admin.from("messages").select("id, content").in("id", idsByKind("message"))
        : none,
      idsByKind("meetup").length
        ? admin.from("meetups").select("id, title, slug").in("id", idsByKind("meetup"))
        : none,
    ]);
  // The threads the reported comments sit on — their kind only, to link right.
  const parentIds = Array.from(
    new Set((rComments ?? []).map((c) => c.post_id as string)),
  );
  const { data: parents } = parentIds.length
    ? await admin.from("forum_posts").select("id, kind").in("id", parentIds)
    : { data: [] as Row[] };
  const parentKind = new Map(
    (parents ?? []).map((p) => [p.id as string, p.kind as string]),
  );

  const productLabel = await tServer("Product");
  type Target = { label?: string; title?: string; snippet?: string; href?: string };
  const targets = new Map<string, Target>();
  for (const p of rPosts ?? []) {
    const isProduct = p.kind === PRODUCT_KIND;
    targets.set(`post:${p.id}`, {
      label: isProduct ? productLabel : undefined,
      title: isProduct ? ((p.title as string | null) ?? undefined) : undefined,
      snippet: p.content as string,
      href: isProduct
        ? productPath(p.id as string)
        : `/community/${p.id as string}`,
    });
  }
  for (const c of rComments ?? []) {
    const postId = c.post_id as string;
    targets.set(`comment:${c.id}`, {
      snippet: c.content as string,
      href:
        parentKind.get(postId) === PRODUCT_KIND
          ? `${productPath(postId)}#comments`
          : `/community/${postId}`,
    });
  }
  for (const m of rMsgs ?? []) {
    targets.set(`message:${m.id}`, { snippet: m.content as string });
  }
  for (const m of rMeetups ?? []) {
    targets.set(`meetup:${m.id}`, {
      snippet: m.title as string,
      href: m.slug ? `/meetups/${m.slug as string}` : undefined,
    });
  }

  return (
    <Section>
      <AdminTabs />
      <div className="mb-8">
        <div className="max-w-[640px]">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <h1 className="text-d2 truncate">{await tServer("Reports")}</h1>
            <span className="shrink-0 text-sm text-ink-muted">
              {(await tServer("{n} reports total")).replace(
                "{n}",
                String(reports?.length ?? 0),
              )}
            </span>
          </div>
        </div>
      </div>

      {error?.message?.includes("reports") ? (
        <Card className="text-sm">
          Reports table not ready. Apply{" "}
          <code>supabase/migrations/0002_community_forum.sql</code> in
          Supabase SQL Editor.
        </Card>
      ) : !reports?.length ? (
        // KIND A — and the good kind of empty: an empty moderation queue is the
        // desired state, so it keeps its existing copy and gets no CTA.
        <EmptyState
          icon={ShieldCheck}
          title={await tServer("No reports")}
          description={await tServer("Everyone’s behaving. For now.")}
        />
      ) : (
        <Paginated pageSize={15} className="space-y-3">
          {reports.map((r) => {
            const kind = r.target_kind as string;
            const targetId = r.target_id as string;
            const target = targets.get(`${kind}:${targetId}`);
            const targetHref =
              kind === "profile" ? `/profile/${targetId}` : target?.href;
            return (
            <Card key={r.id as string} padding="sm">
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.2em] text-gold-ink border border-line px-2 py-0.5 rounded-full">
                    {target?.label ?? KIND_LABEL[kind] ?? kind}
                  </span>
                  <span
                    className={`text-xs uppercase tracking-[0.2em] px-2 py-0.5 border rounded-full ${
                      r.status === "open"
                        ? "border-danger-line text-danger-ink"
                        : "border-line text-ink-muted"
                    }`}
                  >
                    {STATUS_LABEL[r.status as string] ?? (r.status as string)}
                  </span>
                </div>
                <div className="text-xs text-ink-muted">
                  {new Date(r.created_at as string).toLocaleString(
                    locale === "th" ? "th-TH" : "en-GB",
                  )}
                </div>
              </div>
              <p className="text-sm text-ink leading-relaxed mb-3">
                {r.reason as string}
              </p>
              {target?.snippet !== undefined && (
                <div className="bg-cream border-l-2 border-navy p-3 text-sm text-ink mb-3 whitespace-pre-wrap line-clamp-4 rounded-xl">
                  {target.title && (
                    <span className="block font-medium">{target.title}</span>
                  )}
                  {target.snippet}
                </div>
              )}
              <div className="text-xs text-ink-muted flex gap-4">
                <span>
                  {reporterLabel}{" "}
                  <Link
                    href={`/profile/${r.reporter_id}`}
                    className="text-navy hover:text-gold-ink"
                  >
                    {(r.reporter_id as string).slice(0, 8)}…
                  </Link>
                </span>
                <span>
                  {targetLabel}{" "}
                  {targetHref ? (
                    <Link
                      href={targetHref}
                      className="text-navy hover:text-gold-ink"
                    >
                      {targetId.slice(0, 8)}…
                    </Link>
                  ) : (
                    targetId.slice(0, 8) + "…"
                  )}
                </span>
              </div>
              {r.status === "open" && (
                <ReportActions
                  reportId={r.id as string}
                  // What moderateReportAction can delete. Never a profile or a
                  // meetup — "Remove content" on one used to only mark the
                  // report resolved while the thing stayed up.
                  canRemove={REMOVABLE.has(kind)}
                />
              )}
            </Card>
            );
          })}
        </Paginated>
      )}
    </Section>
  );
}
