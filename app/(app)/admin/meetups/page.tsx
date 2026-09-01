import Link from "next/link";
import { notFound } from "next/navigation";
import { Plus, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminUser } from "@/lib/admin";
import { AdminTabs } from "@/components/AdminTabs";
import { meetupWhenParts, type Meetup } from "@/lib/meetups";
import { isPast } from "@/lib/time";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  draft: "text-ink-muted border-line",
  published: "text-navy border-navy",
  cancelled: "text-red-800 border-red-300",
};

export default async function AdminMeetupsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!(await isAdminUser(supabase, user))) notFound();

  const admin = createAdminClient();
  const { data: meetupsRaw } = await admin
    .from("meetups")
    .select(
      "id, slug, title, format, location, online_url, starts_at, ends_at, capacity, status, created_by, created_at, updated_at, description",
    )
    .order("starts_at", { ascending: false });
  const meetups = (meetupsRaw ?? []) as Meetup[];

  // RSVP counts for every meetup in one query.
  const { data: rsvps } = meetups.length
    ? await admin
        .from("meetup_rsvps")
        .select("meetup_id")
        .in(
          "meetup_id",
          meetups.map((m) => m.id),
        )
    : { data: [] as { meetup_id: string }[] };
  const countBy = new Map<string, number>();
  for (const r of rsvps ?? [])
    countBy.set(r.meetup_id, (countBy.get(r.meetup_id) ?? 0) + 1);

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]">
      <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3">
        Admin
      </div>
      <AdminTabs />

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-d2">Meetups</h1>
        <Link
          href="/admin/meetups/new"
          className="px-5 py-2.5 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> New meetup
        </Link>
      </div>

      {meetups.length === 0 ? (
        <div className="bg-white border border-line rounded-xl p-12 text-center text-ink-muted">
          No meetups yet. Create the first one.
        </div>
      ) : (
        <div className="border border-line rounded-xl overflow-hidden divide-y divide-line bg-white">
          {meetups.map((m) => {
            const when = meetupWhenParts(m.starts_at);
            const past = isPast(m.starts_at);
            return (
              <Link
                key={m.id}
                href={`/admin/meetups/${m.id}/edit`}
                className="flex items-center gap-4 px-5 py-4 hover:bg-cream transition-colors"
              >
                <div className="w-24 shrink-0 text-sm">
                  <div className="text-navy font-medium">
                    {when.day} {when.monthYear}
                  </div>
                  <div className="text-xs text-ink-muted">{when.time}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-ink truncate">{m.title}</div>
                  <div className="text-xs text-ink-muted">
                    {m.format === "online" ? "Online" : m.location || "In person"}
                    {past ? " · past" : ""}
                  </div>
                </div>
                <div className="shrink-0 inline-flex items-center gap-1 text-xs text-ink-muted">
                  <Users className="w-3.5 h-3.5" />
                  {countBy.get(m.id) ?? 0}
                  {m.capacity != null ? `/${m.capacity}` : ""}
                </div>
                <span
                  className={`shrink-0 text-[11px] uppercase tracking-[0.15em] px-2 py-0.5 border rounded-full ${
                    STATUS_STYLE[m.status] ?? "text-ink-muted border-line"
                  }`}
                >
                  {m.status}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
