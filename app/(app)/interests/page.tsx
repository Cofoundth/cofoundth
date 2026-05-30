import Link from "next/link";
import { ArrowRight, HandshakeIcon, Inbox, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS, INTENT_LABELS } from "@/lib/matching";
import { tServer, getLocale } from "@/lib/i18n-server";
import { Avatar } from "@/components/Avatar";
import { PartnershipCard, type PartnershipRow } from "./PartnershipCard";

type SearchParams = Promise<{ tab?: string }>;

export default async function InterestsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { tab } = await searchParams;
  const activeTab: "founder" | "partnerships" =
    tab === "partnerships" ? "partnerships" : "founder";

  const supabase = await createClient();
  const locale = await getLocale();
  const isTH = locale === "th";

  const user = await requireUser();

  // ---- Co-founder interests (existing flow) ------------------------
  const { data: sent } = await supabase
    .from("interests")
    .select("id, note, status, created_at, to_profile_id")
    .eq("from_profile_id", user.id)
    .order("created_at", { ascending: false });

  const { data: received } = await supabase
    .from("interests")
    .select("id, note, status, created_at, from_profile_id")
    .eq("to_profile_id", user.id)
    .order("created_at", { ascending: false });

  // ---- B2B partnership requests (both directions) ------------------
  const [
    { data: partnershipReceived },
    { data: partnershipSent },
  ] = await Promise.all([
    supabase
      .from("partnership_requests")
      .select(
        "id, request_type, subject, context, status, deadline_at, response_note, created_at, from_profile_id",
      )
      .eq("to_profile_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("partnership_requests")
      .select(
        "id, request_type, subject, context, status, deadline_at, response_note, created_at, to_profile_id",
      )
      .eq("from_profile_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // ---- Collect counterparty IDs for hydration ----------------------
  const otherIds = Array.from(
    new Set([
      ...(sent ?? []).map((i) => i.to_profile_id as string),
      ...(received ?? []).map((i) => i.from_profile_id as string),
      ...(partnershipReceived ?? []).map((p) => p.from_profile_id as string),
      ...(partnershipSent ?? []).map((p) => p.to_profile_id as string),
    ]),
  );

  const { data: profilesData } = otherIds.length
    ? await supabase
        .from("profiles")
        .select(
          "id, slug, full_name, company_name, i_am, intent, photo_url, type",
        )
        .in("id", otherIds)
    : { data: [] };

  const profiles = new Map(
    (profilesData ?? []).map((p) => [p.id as string, p]),
  );

  // For each accepted partnership, look up the canonical match so we can
  // link to /messages
  const acceptedPairs = [
    ...(partnershipReceived ?? []).filter((p) => p.status === "accepted"),
    ...(partnershipSent ?? []).filter((p) => p.status === "accepted"),
  ];
  const matchByPair = new Map<string, string>();
  if (acceptedPairs.length > 0) {
    const { data: matches } = await supabase
      .from("matches")
      .select("id, profile_a_id, profile_b_id")
      .or(
        `profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`,
      );
    (matches ?? []).forEach((m) => {
      const other =
        m.profile_a_id === user.id ? m.profile_b_id : m.profile_a_id;
      matchByPair.set(other as string, m.id as string);
    });
  }

  // Mutual co-founder matches
  const { data: matches } = await supabase
    .from("matches")
    .select("profile_a_id, profile_b_id")
    .or(`profile_a_id.eq.${user.id},profile_b_id.eq.${user.id}`);

  const mutualWith = new Set<string>(
    (matches ?? []).map((m) =>
      m.profile_a_id === user.id
        ? (m.profile_b_id as string)
        : (m.profile_a_id as string),
    ),
  );

  // Adapt partnership rows for the card component
  function adaptPartnership(
    p: { [k: string]: unknown },
    direction: "received" | "sent",
  ): PartnershipRow {
    const counterpartyId =
      direction === "received"
        ? (p.from_profile_id as string)
        : (p.to_profile_id as string);
    const cp = profiles.get(counterpartyId);
    return {
      id: p.id as string,
      request_type: p.request_type as string,
      subject: p.subject as string,
      context: p.context as string,
      status: p.status as PartnershipRow["status"],
      deadline_at: (p.deadline_at as string | null) ?? null,
      created_at: p.created_at as string,
      response_note: (p.response_note as string | null) ?? null,
      direction,
      matchId:
        p.status === "accepted"
          ? matchByPair.get(counterpartyId) ?? null
          : null,
      counterparty: cp
        ? {
            id: cp.id as string,
            slug: (cp.slug as string | null) ?? null,
            company_name:
              (cp.company_name as string | null) ?? (cp.full_name as string),
            representative: cp.full_name as string,
            photo_url: (cp.photo_url as string | null) ?? null,
          }
        : null,
    };
  }

  const partnershipRows: PartnershipRow[] = [
    ...(partnershipReceived ?? []).map((p) => adaptPartnership(p, "received")),
    ...(partnershipSent ?? []).map((p) => adaptPartnership(p, "sent")),
  ].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));

  const partnershipBadge = (partnershipReceived ?? []).filter(
    (p) => p.status === "open",
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-8 pb-6 border-b border-line">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          {await tServer("Express Interest")}
        </div>
        <h1 className="text-4xl lg:text-5xl mb-2">
          {await tServer("Interests")}
        </h1>
        <p className="text-ink">
          {await tServer("When interest is mutual, messaging unlocks automatically.")}
        </p>
      </div>

      {/* Tab switcher */}
      <div className="mb-8 flex items-center gap-1 border-b border-line">
        <TabLink
          href="/interests"
          active={activeTab === "founder"}
          label={isTH ? "Co-founder" : "Co-founder"}
        />
        <TabLink
          href="/interests?tab=partnerships"
          active={activeTab === "partnerships"}
          label={isTH ? "พาร์ตเนอร์ B2B" : "B2B partnerships"}
          badge={partnershipBadge}
        />
      </div>

      {activeTab === "founder" ? (
        <div className="grid lg:grid-cols-2 gap-10">
          <section>
            <div className="flex items-center gap-3 mb-6">
              <Inbox className="w-5 h-5 text-gold" strokeWidth={1.5} />
              <h2 className="text-2xl">{await tServer("Received")}</h2>
              <span className="text-sm text-ink-muted ml-auto">
                {received?.length ?? 0}
              </span>
            </div>

            {!received?.length ? (
              <EmptyState
                message={await tServer(
                  "No one has expressed interest yet. Make sure your profile is complete.",
                )}
              />
            ) : (
              <div className="space-y-3">
                {await Promise.all(
                  received.map(async (i) => {
                    const p = profiles.get(i.from_profile_id as string);
                    const isMutual = mutualWith.has(
                      i.from_profile_id as string,
                    );
                    return (
                      <InterestCard
                        key={i.id as string}
                        profileSlug={
                          (p?.slug as string | null) ??
                          (i.from_profile_id as string)
                        }
                        name={(p?.full_name as string) ?? "A founder"}
                        photoUrl={(p?.photo_url as string | null) ?? null}
                        role={(p?.i_am as string[] | null) ?? []}
                        intent={(p?.intent as string[] | null) ?? []}
                        note={(i.note as string | null) ?? null}
                        isMutual={isMutual}
                        actionLabel={await tServer(
                          isMutual ? "Open conversation" : "View profile",
                        )}
                        mutualLabel={await tServer("Mutual")}
                      />
                    );
                  }),
                )}
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-3 mb-6">
              <Send className="w-5 h-5 text-gold" strokeWidth={1.5} />
              <h2 className="text-2xl">{await tServer("Sent")}</h2>
              <span className="text-sm text-ink-muted ml-auto">
                {sent?.length ?? 0}
              </span>
            </div>

            {!sent?.length ? (
              <EmptyState
                message={await tServer(
                  "You haven't expressed interest in anyone yet. Browse the directory.",
                )}
              />
            ) : (
              <div className="space-y-3">
                {await Promise.all(
                  sent.map(async (i) => {
                    const p = profiles.get(i.to_profile_id as string);
                    const isMutual = mutualWith.has(i.to_profile_id as string);
                    return (
                      <InterestCard
                        key={i.id as string}
                        profileSlug={
                          (p?.slug as string | null) ??
                          (i.to_profile_id as string)
                        }
                        name={(p?.full_name as string) ?? "A founder"}
                        photoUrl={(p?.photo_url as string | null) ?? null}
                        role={(p?.i_am as string[] | null) ?? []}
                        intent={(p?.intent as string[] | null) ?? []}
                        note={(i.note as string | null) ?? null}
                        isMutual={isMutual}
                        actionLabel={await tServer(
                          isMutual ? "Open conversation" : "Waiting",
                        )}
                        mutualLabel={await tServer("Mutual")}
                      />
                    );
                  }),
                )}
              </div>
            )}
          </section>
        </div>
      ) : (
        <section>
          <div className="flex items-center gap-3 mb-6">
            <HandshakeIcon className="w-5 h-5 text-gold" strokeWidth={1.5} />
            <h2 className="text-2xl">
              {isTH ? "คำขอความร่วมมือ B2B" : "Partnership requests"}
            </h2>
            <span className="text-sm text-ink-muted ml-auto">
              {partnershipRows.length}
            </span>
          </div>

          {partnershipRows.length === 0 ? (
            <div className="bg-white border border-line p-12 text-center">
              <HandshakeIcon
                className="w-8 h-8 text-ink-muted mx-auto mb-4"
                strokeWidth={1}
              />
              <h3 className="text-xl mb-2">
                {isTH
                  ? "ยังไม่มีคำขอความร่วมมือ"
                  : "No partnership requests yet"}
              </h3>
              <p className="text-ink-muted leading-relaxed max-w-md mx-auto mb-5">
                {isTH
                  ? "เมื่อบริษัทอื่นส่งคำขอความร่วมมือมา หรือคุณส่งไปยังบริษัทอื่น จะปรากฏที่นี่"
                  : "When another company sends you a partnership request, or you send one, it'll show up here."}
              </p>
              <Link
                href="/companies"
                className="inline-flex items-center gap-2 px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
              >
                {isTH ? "สำรวจบริษัท" : "Browse companies"}
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {partnershipRows.map((row) => (
                <PartnershipCard key={row.id} row={row} locale={locale} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function TabLink({
  href,
  active,
  label,
  badge,
}: {
  href: string;
  active: boolean;
  label: string;
  badge?: number;
}) {
  return (
    <Link
      href={href}
      className={`relative inline-flex items-center gap-2 px-5 py-3 text-sm tracking-wide -mb-px border-b-2 transition-colors ${
        active
          ? "border-navy text-navy font-medium"
          : "border-transparent text-ink-muted hover:text-navy"
      }`}
    >
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="min-w-[18px] h-[18px] px-1 text-[10px] bg-gold text-white inline-flex items-center justify-center font-medium">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </Link>
  );
}

function InterestCard({
  profileSlug,
  name,
  photoUrl,
  role,
  intent,
  note,
  isMutual,
  actionLabel,
  mutualLabel,
}: {
  profileSlug: string;
  name: string;
  photoUrl: string | null;
  role: string[];
  intent: string[];
  note: string | null;
  isMutual: boolean;
  actionLabel: string;
  mutualLabel: string;
}) {
  const href = isMutual ? `/matches` : `/profile/${profileSlug}`;
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
                {role.length > 0 && role.map((r) => ROLE_LABELS[r]).join(" · ")}
                {intent.length > 0 && (
                  <>
                    {" "}
                    &middot;{" "}
                    <span className="text-gold">
                      {intent.map((x) => INTENT_LABELS[x]).join(" · ")}
                    </span>
                  </>
                )}
              </div>
            </div>
            {isMutual && (
              <span className="text-[10px] uppercase tracking-[0.2em] text-gold border border-gold px-2 py-0.5 shrink-0">
                {mutualLabel}
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
