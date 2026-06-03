import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { AdminTabs } from "@/components/AdminTabs";
import { tServer, getLocale } from "@/lib/i18n-server";

export default async function AdminReportsPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) notFound();

  const KIND_LABEL: Record<string, string> = {
    profile: await tServer("Profile"),
    post: await tServer("Post"),
    message: await tServer("Message"),
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

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <AdminTabs />
      <div className="mb-10 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          {await tServer("Admin")}
        </div>
        <h1 className="text-4xl mb-2">{await tServer("Reports")}</h1>
        <p className="text-ink">
          {(await tServer("{n} reports total")).replace(
            "{n}",
            String(reports?.length ?? 0),
          )}
        </p>
      </div>

      {error?.message?.includes("reports") ? (
        <div className="bg-white border border-gold/40 p-6 text-sm">
          Reports table not ready. Apply{" "}
          <code>supabase/migrations/0002_community_forum.sql</code> in
          Supabase SQL Editor.
        </div>
      ) : !reports?.length ? (
        <div className="bg-white border border-line p-12 text-center">
          <h3 className="text-2xl mb-2">{await tServer("No reports")}</h3>
          <p className="text-ink-muted">
            {await tServer("Everyone’s behaving. For now.")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div
              key={r.id as string}
              className="bg-white border border-line p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold px-2 py-0.5">
                    {KIND_LABEL[r.target_kind as string] ??
                      (r.target_kind as string)}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border ${
                      r.status === "open"
                        ? "border-red-300 text-red-700"
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
              <div className="text-xs text-ink-muted flex gap-4">
                <span>
                  {reporterLabel}{" "}
                  <Link
                    href={`/profile/${r.reporter_id}`}
                    className="text-navy hover:text-gold"
                  >
                    {(r.reporter_id as string).slice(0, 8)}…
                  </Link>
                </span>
                <span>
                  {targetLabel}{" "}
                  {r.target_kind === "profile" ? (
                    <Link
                      href={`/profile/${r.target_id}`}
                      className="text-navy hover:text-gold"
                    >
                      {(r.target_id as string).slice(0, 8)}…
                    </Link>
                  ) : (
                    (r.target_id as string).slice(0, 8) + "…"
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
