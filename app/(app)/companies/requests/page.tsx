import Link from "next/link";
import {
  ArrowRight,
  Clock,
  HandshakeIcon,
  Plus,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getLocale, tServer } from "@/lib/i18n-server";
import { Avatar } from "@/components/Avatar";
import { AskRowActions } from "./AskRowActions";

export const dynamic = "force-dynamic";

type AskStatus = "open" | "filled" | "closed";

// English label is the dictionary key; Thai comes from tServer() at render.
const TYPE_LABEL: Record<string, string> = {
  integration: "Integration",
  distribution: "Distribution",
  white_label: "White label",
  co_marketing: "Co-marketing",
  vendor_supplier: "Vendor",
  other: "Other",
};

const STATUS_LABEL: Record<AskStatus, { en: string; tone: string }> = {
  open: { en: "Open", tone: "border-gold text-gold" },
  filled: { en: "Filled", tone: "border-gold bg-gold text-white" },
  closed: { en: "Closed", tone: "border-line text-ink-muted" },
};

type TimeAgoLabels = {
  justNow: string;
  hoursAgo: string; // contains {n}
  daysAgo: string; // contains {n}
};

function timeAgo(iso: string, locale: string, labels: TimeAgoLabels): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  const d = Math.floor(diff / 86_400_000);
  if (h < 1) return labels.justNow;
  if (h < 24) return labels.hoursAgo.replace("{n}", String(h));
  if (d < 7) return labels.daysAgo.replace("{n}", String(d));
  return new Date(iso).toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

export default async function PartnershipRequestsBoardPage() {
  const supabase = await createClient();
  const locale = await getLocale();
  const isTH = locale === "th";

  const user = await requireUser();

  const { data: me } = await supabase
    .from("profiles")
    .select("type, onboarded")
    .eq("id", user.id)
    .single();
  const canPost = me?.type === "company" && me?.onboarded === true;

  // Order open first, then filled, then closed — within group, newest first
  const { data: openAsks } = await supabase
    .from("partnership_asks")
    .select(
      "id, author_id, request_type, subject, context, status, deadline_at, created_at",
    )
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(50);

  const { data: closedAsks } = await supabase
    .from("partnership_asks")
    .select(
      "id, author_id, request_type, subject, context, status, deadline_at, created_at",
    )
    .in("status", ["filled", "closed"])
    .order("created_at", { ascending: false })
    .limit(20);

  const allAsks = [...(openAsks ?? []), ...(closedAsks ?? [])];

  // Hydrate authors
  const authorIds = Array.from(
    new Set(allAsks.map((a) => a.author_id as string)),
  );
  const { data: authors } = authorIds.length
    ? await supabase
        .from("profiles")
        .select("id, slug, full_name, company_name, photo_url, verified")
        .in("id", authorIds)
    : { data: [] };
  const authorMap = new Map(
    (authors ?? []).map((a) => [a.id as string, a]),
  );

  // Pre-resolve strings used inside the (synchronous) ask map.
  const timeLabels: TimeAgoLabels = {
    justNow: await tServer("just now"),
    hoursAgo: await tServer("{n}h ago"),
    daysAgo: await tServer("{n}d ago"),
  };
  const typeLabel: Record<string, string> = Object.fromEntries(
    await Promise.all(
      Object.entries(TYPE_LABEL).map(
        async ([k, en]) => [k, await tServer(en)] as const,
      ),
    ),
  );
  const statusLabel = Object.fromEntries(
    await Promise.all(
      (Object.keys(STATUS_LABEL) as AskStatus[]).map(
        async (k) => [k, await tServer(STATUS_LABEL[k].en)] as const,
      ),
    ),
  ) as Record<AskStatus, string>;
  const labels = {
    deadline: await tServer("Deadline"),
    respondHint: await tServer(
      "View their profile to respond with a partnership request",
    ),
    respond: await tServer("Respond"),
    viewProfile: await tServer("View profile"),
  };

  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-10 py-10">
      {/* Header */}
      <div className="mb-10 pb-8 border-b border-line flex items-start justify-between gap-6 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3 inline-flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
            {await tServer("B2B Partnership board")}
            <span className="text-line">·</span>
            <span className="normal-case tracking-normal text-ink-muted">
              Beta
            </span>
          </div>
          <h1 className="text-4xl lg:text-5xl mb-2">
            {await tServer("What companies are looking for")}
          </h1>
          <p className="text-ink max-w-2xl">
            {await tServer(
              "Public board of B2B partnership asks. Post what your company needs, or browse what others are looking for.",
            )}
          </p>
        </div>
        {canPost ? (
          <Link
            href="/companies/requests/new"
            className="px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            {await tServer("Post an ask")}
          </Link>
        ) : (
          <div className="bg-cream border-l-2 border-gold p-4 text-sm text-ink max-w-md">
            {await tServer(
              "Switch your profile type to Company to post partnership asks.",
            )}
            <br />
            <Link
              href="/onboarding"
              className="text-navy hover:text-gold underline underline-offset-4 decoration-gold/30 mt-1 inline-block"
            >
              {await tServer("Edit profile →")}
            </Link>
          </div>
        )}
      </div>

      {allAsks.length === 0 ? (
        <div className="bg-white border border-line p-12 text-center">
          <HandshakeIcon
            className="w-8 h-8 text-ink-muted mx-auto mb-4"
            strokeWidth={1}
          />
          <h3 className="text-2xl mb-2">{await tServer("No asks yet")}</h3>
          <p className="text-ink-muted leading-relaxed max-w-md mx-auto mb-6">
            {await tServer(
              "Be the first to post. Describe the partner you need — other companies will see it and reach out.",
            )}
          </p>
          {canPost && (
            <Link
              href="/companies/requests/new"
              className="inline-flex items-center gap-2 px-5 py-3 bg-navy hover:bg-navy-dark text-white text-sm"
            >
              <Plus className="w-4 h-4" />
              {await tServer("Post the first ask")}
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {allAsks.map((ask) => {
            const author = authorMap.get(ask.author_id as string);
            const askStatus = ask.status as AskStatus;
            const statusTone = STATUS_LABEL[askStatus].tone;
            const statusText = statusLabel[askStatus];
            const typeText =
              typeLabel[ask.request_type as string] ?? typeLabel.other;
            const authorHref = `/profile/${(author?.slug as string | undefined) ?? ask.author_id}`;
            const fresh =
              ask.status === "open" &&
              Date.now() - new Date(ask.created_at as string).getTime() <
                24 * 3600_000;
            const isMine = ask.author_id === user.id;
            const canRespond =
              !isMine && canPost && ask.status === "open";

            return (
              <div
                key={ask.id as string}
                className={`bg-white border p-5 ${
                  ask.status === "open"
                    ? "border-gold/30"
                    : "border-line opacity-80"
                }`}
              >
                <div className="flex items-start gap-4">
                  <Link href={authorHref} className="shrink-0">
                    <Avatar
                      name={
                        (author?.company_name as string) ??
                        (author?.full_name as string)
                      }
                      url={author?.photo_url as string | null}
                      size="md"
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                      <div className="min-w-0">
                        <div className="text-xs flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-gold inline-flex items-center gap-1">
                            <HandshakeIcon
                              className="w-3 h-3"
                              strokeWidth={1.5}
                            />
                            {typeText}
                          </span>
                          <span className="text-ink-muted">·</span>
                          <Link
                            href={authorHref}
                            className="text-navy font-medium hover:text-gold"
                          >
                            {(author?.company_name as string) ??
                              (author?.full_name as string) ??
                              "A company"}
                          </Link>
                          <span className="text-ink-muted">·</span>
                          <span className="text-ink-muted">
                            {timeAgo(
                              ask.created_at as string,
                              locale,
                              timeLabels,
                            )}
                          </span>
                          {fresh && (
                            <span className="w-1.5 h-1.5 rounded-full bg-gold inline-block" />
                          )}
                        </div>
                        <h3 className="font-serif text-xl text-navy leading-tight">
                          {ask.subject as string}
                        </h3>
                      </div>
                      <span
                        className={`text-[10px] uppercase tracking-[0.2em] px-2 py-0.5 border shrink-0 ${statusTone}`}
                      >
                        {statusText}
                      </span>
                    </div>

                    <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap mb-3 line-clamp-4">
                      {ask.context as string}
                    </p>

                    {ask.deadline_at && (
                      <div className="text-xs text-ink-muted mb-3 inline-flex items-center gap-1.5">
                        <Clock className="w-3 h-3" strokeWidth={1.5} />
                        {labels.deadline}:{" "}
                        {new Date(
                          ask.deadline_at as string,
                        ).toLocaleDateString(isTH ? "th-TH" : "en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    )}

                    <div className="pt-3 border-t border-line flex items-center justify-between gap-3 flex-wrap">
                      <div className="text-xs text-ink-muted flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-gold" strokeWidth={1.5} />
                        {labels.respondHint}
                      </div>
                      <div className="flex items-center gap-3">
                        {isMine && (
                          <AskRowActions
                            askId={ask.id as string}
                            status={ask.status as AskStatus}
                            locale={locale}
                          />
                        )}
                        {canRespond && (
                          <Link
                            href={`/companies?focus=${ask.author_id}`}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
                          >
                            {labels.respond}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        {!canRespond && !isMine && (
                          <Link
                            href={authorHref}
                            className="text-sm text-navy hover:text-gold inline-flex items-center gap-1"
                          >
                            {labels.viewProfile}
                            <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
