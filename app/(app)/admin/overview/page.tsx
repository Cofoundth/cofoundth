import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { AdminTabs } from "@/components/AdminTabs";
import { TrendTabs } from "@/components/TrendTabs";

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
  const since = new Date(Date.now() - DAYS * DAY_MS).toISOString();
  const weekAgo = new Date(Date.now() - 7 * DAY_MS).toISOString();

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
      color: "#0A1F44",
    },
    {
      label: "New posts",
      total: totalPosts ?? 0,
      week: postsWeek ?? 0,
      data: dailyBuckets((postRows ?? []) as { created_at: string }[]),
      color: "#1F4E4A",
    },
    {
      label: "New matches",
      total: totalMatches ?? 0,
      week: matchesWeek ?? 0,
      data: dailyBuckets((matchRows ?? []) as { created_at: string }[]),
      color: "#B8941F",
    },
  ];

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const dates = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(todayStart.getTime() - (DAYS - 1 - i) * DAY_MS);
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  });

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      <AdminTabs />
      <div className="mb-8 pb-6 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          Admin
        </div>
        <h1 className="text-4xl mb-2">Overview</h1>
        <p className="text-ink">
          {openReports ?? 0} open report{openReports === 1 ? "" : "s"} · last{" "}
          {DAYS} days
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white border border-line p-5">
            <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-1">
              {c.label}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl text-navy">{c.total}</span>
              <span className="text-xs text-gold">+{c.week} this week</span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border border-line p-5 mt-4">
        <div className="text-xs uppercase tracking-[0.2em] text-gold mb-4">
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
    </div>
  );
}
