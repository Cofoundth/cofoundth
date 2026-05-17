import Link from "next/link";
import { ArrowRight, Send, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABELS, INTENT_LABELS } from "@/lib/matching";
import { Avatar } from "@/components/Avatar";

export default async function InterestsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Interests sent BY me — others I'm interested in
  const { data: sent } = await supabase
    .from("interests")
    .select("id, note, status, created_at, to_profile_id")
    .eq("from_profile_id", user!.id)
    .order("created_at", { ascending: false });

  // Interests sent TO me — others who're interested in me
  const { data: received } = await supabase
    .from("interests")
    .select("id, note, status, created_at, from_profile_id")
    .eq("to_profile_id", user!.id)
    .order("created_at", { ascending: false });

  const otherIds = Array.from(
    new Set([
      ...(sent ?? []).map((i) => i.to_profile_id as string),
      ...(received ?? []).map((i) => i.from_profile_id as string),
    ]),
  );

  const { data: profilesData } = otherIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, i_am, intent, photo_url")
        .in("id", otherIds)
    : { data: [] };

  const profiles = new Map(
    (profilesData ?? []).map((p) => [p.id as string, p]),
  );

  // For each sent interest, check if mutual (= a match exists)
  const { data: matches } = await supabase
    .from("matches")
    .select("profile_a_id, profile_b_id")
    .or(`profile_a_id.eq.${user!.id},profile_b_id.eq.${user!.id}`);

  const mutualWith = new Set<string>(
    (matches ?? []).map((m) =>
      m.profile_a_id === user!.id
        ? (m.profile_b_id as string)
        : (m.profile_a_id as string),
    ),
  );

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-10 pb-8 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          Express Interest
        </div>
        <h1 className="text-4xl lg:text-5xl mb-2">Interests</h1>
        <p className="text-ink">
          When interest is mutual, messaging unlocks automatically.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-10">
        {/* Received */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Inbox className="w-5 h-5 text-gold" strokeWidth={1.5} />
            <h2 className="text-2xl">Received</h2>
            <span className="text-sm text-ink-muted ml-auto">
              {received?.length ?? 0}
            </span>
          </div>

          {!received?.length ? (
            <EmptyState message="No one has expressed interest yet. Make sure your profile is complete." />
          ) : (
            <div className="space-y-3">
              {received.map((i) => {
                const p = profiles.get(i.from_profile_id as string);
                const isMutual = mutualWith.has(i.from_profile_id as string);
                return (
                  <InterestCard
                    key={i.id as string}
                    profileId={i.from_profile_id as string}
                    name={p?.full_name as string}
                    photoUrl={p?.photo_url as string | null}
                    role={p?.i_am as string | null}
                    intent={p?.intent as string | null}
                    note={i.note as string | null}
                    createdAt={i.created_at as string}
                    isMutual={isMutual}
                    actionLabel={isMutual ? "Open conversation" : "View profile"}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Sent */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <Send className="w-5 h-5 text-gold" strokeWidth={1.5} />
            <h2 className="text-2xl">Sent</h2>
            <span className="text-sm text-ink-muted ml-auto">
              {sent?.length ?? 0}
            </span>
          </div>

          {!sent?.length ? (
            <EmptyState message="You haven't expressed interest in anyone yet. Browse the directory." />
          ) : (
            <div className="space-y-3">
              {sent.map((i) => {
                const p = profiles.get(i.to_profile_id as string);
                const isMutual = mutualWith.has(i.to_profile_id as string);
                return (
                  <InterestCard
                    key={i.id as string}
                    profileId={i.to_profile_id as string}
                    name={p?.full_name as string}
                    photoUrl={p?.photo_url as string | null}
                    role={p?.i_am as string | null}
                    intent={p?.intent as string | null}
                    note={i.note as string | null}
                    createdAt={i.created_at as string}
                    isMutual={isMutual}
                    actionLabel={isMutual ? "Open conversation" : "Waiting"}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InterestCard({
  profileId,
  name,
  photoUrl,
  role,
  intent,
  note,
  createdAt,
  isMutual,
  actionLabel,
}: {
  profileId: string;
  name: string | null | undefined;
  photoUrl: string | null;
  role: string | null;
  intent: string | null;
  note: string | null;
  createdAt: string;
  isMutual: boolean;
  actionLabel: string;
}) {
  const href = isMutual ? `/matches` : `/profile/${profileId}`;
  void createdAt;

  return (
    <Link
      href={href}
      className={`block p-5 transition-colors group ${
        isMutual
          ? "bg-white border border-gold/40 hover:border-gold"
          : "bg-white border border-line hover:border-navy"
      }`}
    >
      <div className="flex items-start gap-4">
        <Avatar name={name} url={photoUrl} size="md" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 mb-1.5">
            <div>
              <div className="font-serif text-lg text-navy">{name}</div>
              <div className="text-xs text-ink-muted">
                {role && ROLE_LABELS[role]}
                {intent && (
                  <>
                    {" "}
                    &middot;{" "}
                    <span className="text-gold">{INTENT_LABELS[intent]}</span>
                  </>
                )}
              </div>
            </div>
            {isMutual && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold px-2 py-0.5 shrink-0">
                Mutual
              </span>
            )}
          </div>
          {note && (
            <p className="text-sm text-ink leading-relaxed mt-2 italic">
              &ldquo;{note}&rdquo;
            </p>
          )}
          <div className="text-xs text-ink-muted mt-3 inline-flex items-center gap-1 group-hover:text-navy">
            {actionLabel} <ArrowRight className="w-3 h-3" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="bg-white border border-line p-8 text-center">
      <p className="text-sm text-ink-muted">{message}</p>
    </div>
  );
}
