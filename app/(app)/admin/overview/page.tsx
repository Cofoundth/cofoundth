import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { AdminTabs } from "@/components/AdminTabs";
import { TrendTabs } from "@/components/TrendTabs";
import { msAgoISO } from "@/lib/time";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const DAYS = 30;
const DAY_MS = 86_400_000;

// Bucket created_at timestamps into the last `DAYS` calendar days (oldest → newest).
function dailyBuckets(rows: { created_at: string }[]): number[] {
  const counts = new Array(DAYS).fill(0);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const startMs = todayStart.getTime() - (DAYS - 1) * DAY_MS;
  for (const r of rows) {
    const idx = Math.floor((new Date(r.created_at).getTime() - startMs) / DAY_MS);
    if (idx >= 0 && idx < DAYS) counts[idx]++;
  }
  return counts;
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  const admin = createAdminClient();
  const since = msAgoISO(DAYS * DAY_MS);
  const weekAgo = msAgoISO(7 * DAY_MS);

  const [
    { count: totalUsers },
    { count: totalPosts },
    { count: totalMatches },
    { count: openReports },
    { data: userRows },
    { data: postRows },
    { data: matchRows },
    { count: usersWeek },
    { count: postsWeek },
    { count: matchesWeek },
  ] = await Promise.all([
    admin.from("profiles").select("id", { count: "exact", head: true }),
    admin.from("forum_posts").select("id", { count: "exact", head: true }),
    admin.from("matches").select("id", { count: "exact", head: true }),
    admin
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    admin.from("profiles").select("created_at").gte("created_at", since),
    admin.from("forum_posts").select("created_at").gte("created_at", since),
    admin.from("matches").select("created_at").gte("created_at", since),
    admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin
      .from("forum_posts")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin
      .from("matches")
      .select("id", { count: "exact", head: true })
      .gte("created_at", weekAgo),
  ]);

  const cards = [
    {
      label: "New users",
      total: totalUsers ?? 0,
      week: usersWeek ?? 0,
      data: dailyBuckets((userRows ?? []) as { created_at: string }[]),
      color: "#1B1A17",
    },
    {
      label: "New posts",
      total: totalPosts ?? 0,
      week: postsWeek ?? 0,
      data: dailyBuckets((postRows ?? []) as { created_at: string }[]),
      color: "#1B1A17",
    },
    {
      label: "New matches",
      total: totalMatches ?? 0,
      week: matchesWeek ?? 0,
      data: dailyBuckets((matchRows ?? []) as { created_at: string }[]),
      color: "#1B1A17",
    },
  ];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(todayStart.getTime() - (DAYS - 1 - i) * DAY_MS);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  });

  return (
    <Section>
      <AdminTabs />
      <div className="mb-8">
        <div className="max-w-[640px]">
          <h1 className="text-d2 mb-2">Overview</h1>
          <p className="text-sm text-ink-muted">
            {openReports ?? 0} open report{openReports === 1 ? "" : "s"} · last{" "}
            {DAYS} days
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white p-5 rounded-3xl shadow-xs">
            <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-1">
              {c.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-d2 text-navy">{c.total}</span>
              <span className="text-xs text-gold-ink">+{c.week} this week</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white p-5 mt-4 rounded-3xl shadow-xs">
        <div className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-4">
          Daily activity · last {DAYS} days
        </div>
        <TrendTabs
          dates={dates}
          series={cards.map((c) => ({
            name: c.label,
            data: c.data,
            color: c.color,
          }))}
        />
      </div>
      <p className="text-[11px] text-ink-muted mt-2">
        It&rsquo;ll fill in as activity grows.
      </p>
    </Section>
  );
}
