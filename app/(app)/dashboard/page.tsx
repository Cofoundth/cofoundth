import Link from "next/link";
import { ArrowRight, Eye, Inbox, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarded, i_am, intent")
    .eq("id", user!.id)
    .single();

  // Counts
  const [
    { count: receivedCount },
    { count: matchesCount },
    { count: viewsCount },
  ] = await Promise.all([
    supabase
      .from("interests")
      .select("id", { count: "exact", head: true })
      .eq("to_profile_id", user!.id),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .or(`profile_a_id.eq.${user!.id},profile_b_id.eq.${user!.id}`),
    supabase
      .from("profile_views")
      .select("id", { count: "exact", head: true })
      .eq("viewed_id", user!.id),
  ]);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-12">
      <div className="mb-12 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          Welcome
        </div>
        <h1 className="text-4xl lg:text-5xl mb-2">
          Hello, {profile?.full_name ?? "founder"}.
        </h1>
        <p className="text-ink leading-relaxed">
          You&rsquo;re in. Phase I &middot; co-founder matching.
        </p>
      </div>

      {!profile?.onboarded && (
        <div className="bg-white border border-gold/40 p-8 lg:p-10 mb-8">
          <div className="flex items-start gap-6">
            <div className="font-serif text-3xl text-gold leading-none mt-1">
              I
            </div>
            <div className="flex-1">
              <h2 className="text-2xl mb-3">Finish your founder profile</h2>
              <p className="text-ink leading-relaxed mb-6 max-w-2xl">
                Declare what you are, what you bring, and what you&rsquo;re
                looking for. The more your profile says, the better the matches.
              </p>
              <Link
                href="/onboarding"
                className="px-6 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2"
              >
                Start onboarding <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-10">
        <StatCard
          icon={Inbox}
          label="Interests received"
          value={receivedCount ?? 0}
          href="/interests"
        />
        <StatCard
          icon={Users}
          label="Mutual matches"
          value={matchesCount ?? 0}
          href="/matches"
        />
        <StatCard
          icon={Eye}
          label="Profile views"
          value={viewsCount ?? 0}
          href={`/profile/${user!.id}`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white border border-line p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-3">
            Founder directory
          </div>
          <h3 className="text-xl mb-2">Browse founders</h3>
          <p className="text-sm text-ink leading-relaxed mb-4">
            Filter by role, industry, and stage. Read full pitches before you
            express interest.
          </p>
          <Link
            href="/browse"
            className="text-sm text-navy hover:text-gold inline-flex items-center gap-1"
          >
            Open directory <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="bg-white border border-line p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-3">
            Your profile
          </div>
          <h3 className="text-xl mb-2">Update your pitch</h3>
          <p className="text-sm text-ink leading-relaxed mb-4">
            Refine your pitch and details. Better signal &mdash; better matches.
          </p>
          <Link
            href="/onboarding"
            className="text-sm text-navy hover:text-gold inline-flex items-center gap-1"
          >
            Edit profile <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="bg-white border border-line hover:border-navy p-5 transition-colors group block"
    >
      <div className="flex items-start justify-between mb-3">
        <Icon
          className="w-5 h-5 text-gold group-hover:text-navy transition-colors"
          strokeWidth={1.5}
        />
        <ArrowRight className="w-4 h-4 text-ink-muted group-hover:text-navy transition-colors" />
      </div>
      <div className="font-serif text-3xl text-navy leading-none mb-1">
        {value}
      </div>
      <div className="text-xs uppercase tracking-[0.15em] text-ink-muted">
        {label}
      </div>
    </Link>
  );
}
