"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  HandshakeIcon,
  MapPin,
  Search as SearchIcon,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import { Button, EmptyState, LinkButton, Section } from "@/components/ui";
import { useT, useLocale } from "@/lib/i18n-client";
import { provinceLabel } from "@/lib/provinces";
import { PartnershipRequestDialog } from "./PartnershipRequestDialog";
import { isWithinMs, DAY_MS } from "@/lib/time";

export type CompanyProfile = {
  id: string;
  slug: string;
  company_name: string;
  representative: string;
  photo_url: string | null;
  verified: boolean;
  location: string | null;
  industry: string[];
  stage: string | null;
  pitch: string | null;
  capabilities: string[];
  partnership_seeking: string[];
  status_tags: string[];
  created_at: string;
};

// English label is the dictionary key; Thai comes from tr() at render.
const STATUS_TAG_LABEL: Record<string, string> = {
  open_to_partnerships: "Open to partnerships",
  open_to_cofounder: "Open to co-founder",
  hiring: "Hiring",
  raising: "Raising",
  looking_for_advisors: "Looking for advisors",
};

type Props = {
  companies: CompanyProfile[];
  capabilities: string[];
  seeking: string[];
  locale: "en" | "th";
  currentUserIsCompany: boolean;
  currentUserCompanyName: string | null;
  focusId?: string | null;
};

export function CompaniesClient({
  companies,
  capabilities,
  seeking,
  currentUserIsCompany,
  currentUserCompanyName,
  focusId,
}: Props) {
  const tr = useT();

  const [searchTerm, setSearchTerm] = useState("");
  const [capabilityFilters, setCapabilityFilters] = useState<string[]>([]);
  const [seekingFilters, setSeekingFilters] = useState<string[]>([]);
  const [requestTarget, setRequestTarget] = useState<CompanyProfile | null>(
    null,
  );

  // Deep-link from the partnership board ("Respond" → /companies?focus=<id>):
  // auto-open the request dialog for that company, if the viewer can send.
  // Runs during render when `focusId` changes (incl. first render) — tracking
  // the previous value so we react only to focus changes, not to every
  // companies/eligibility update.
  const [prevFocusId, setPrevFocusId] = useState<string | null | undefined>(
    undefined,
  );
  if (focusId !== prevFocusId) {
    setPrevFocusId(focusId);
    if (focusId && currentUserIsCompany) {
      const target = companies.find((c) => c.id === focusId);
      if (target) setRequestTarget(target);
    }
  }

  function toggle(
    set: React.Dispatch<React.SetStateAction<string[]>>,
    v: string,
  ) {
    set((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const hay = [
          c.company_name,
          c.representative,
          c.pitch ?? "",
          c.location ?? "",
          ...c.capabilities,
          ...c.partnership_seeking,
          ...c.industry,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (
        capabilityFilters.length > 0 &&
        !capabilityFilters.some((cap) => c.capabilities.includes(cap))
      ) {
        return false;
      }
      if (
        seekingFilters.length > 0 &&
        !seekingFilters.some((s) => c.partnership_seeking.includes(s))
      ) {
        return false;
      }
      return true;
    });
  }, [companies, searchTerm, capabilityFilters, seekingFilters]);

  const activeFilters =
    capabilityFilters.length + seekingFilters.length + (searchTerm ? 1 : 0);

  function clearFilters() {
    setSearchTerm("");
    setCapabilityFilters([]);
    setSeekingFilters([]);
  }

  return (
    <Section>
      {/* Header */}
      <div className="mb-8 pb-8 border-b border-line">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="max-w-[640px]">
            <div className="text-xs uppercase tracking-[0.25em] text-gold-ink mb-3 inline-flex items-center gap-2">
              <Building2 className="w-3 h-3" strokeWidth={1.5} />
              {tr("B2B Network")}
              <span className="text-ink-muted/70">·</span>
              <span className="normal-case tracking-normal text-ink-muted">
                Beta
              </span>
            </div>
            <h1 className="text-d3 mb-2">
              {tr("Companies in the community")}
            </h1>
            <p className="text-ink max-w-2xl">
              {tr(
                "Find the right business partner. Filter by capabilities offered or partnerships sought.",
              )}
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/companies/requests"
              className="text-sm text-navy hover:text-gold-ink inline-flex items-center gap-1.5 px-4 py-2 border border-line hover:border-navy transition-colors rounded-xl"
            >
              <HandshakeIcon className="w-4 h-4" strokeWidth={1.5} />
              {tr("Partnership board")}
            </Link>
            <div className="text-right">
              <div className="font-serif text-num1 text-navy">
                {companies.length}
              </div>
              <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mt-1">
                {tr("Companies")}
              </div>
            </div>
          </div>
        </div>

        {!currentUserIsCompany && (
          <div className="mt-6 bg-cream border-l-2 border-navy p-4 rounded-xl">
            <p className="text-sm text-ink leading-relaxed">
              {tr(
                "Want to send partnership requests? Your profile must be a Company type first. ",
              )}
              <Link
                href="/onboarding"
                className="text-navy hover:text-gold-ink underline underline-offset-4 decoration-line"
              >
                {tr("Edit profile")}
              </Link>
            </p>
          </div>
        )}
      </div>

      <div className="grid xl:grid-cols-12 gap-8">
        {/* Filter sidebar */}
        <aside className="xl:col-span-3">
          <div className="lg:sticky lg:top-6 space-y-8">
            <div>
              <label
                htmlFor="company-search"
                className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
              >
                {tr("Search")}
              </label>
              <div className="relative">
                <SearchIcon
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-muted"
                  strokeWidth={1.5}
                />
                <input
                  id="company-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={tr("Name, capability…")}
                  className="w-full pl-9 pr-3 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
                />
              </div>
            </div>

            {capabilities.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
                  {tr("Offers")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {capabilities.map((cap) => (
                    <FilterChip
                      key={cap}
                      selected={capabilityFilters.includes(cap)}
                      onClick={() => toggle(setCapabilityFilters, cap)}
                    >
                      {cap}
                    </FilterChip>
                  ))}
                </div>
              </div>
            )}

            {seeking.length > 0 && (
              <div>
                <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
                  {tr("Seeking")}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {seeking.map((s) => (
                    <FilterChip
                      key={s}
                      selected={seekingFilters.includes(s)}
                      onClick={() => toggle(setSeekingFilters, s)}
                    >
                      {s}
                    </FilterChip>
                  ))}
                </div>
              </div>
            )}

            {activeFilters > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-ink-muted hover:text-navy"
              >
                {tr("Clear filters ({n})").replace("{n}", String(activeFilters))}
              </button>
            )}
          </div>
        </aside>

        {/* Results */}
        <div className="xl:col-span-9">
          {filtered.length === 0 ? (
            companies.length === 0 ? (
              // NOTHING LISTED YET. The viewer's own company is filtered out
              // of `companies`, so a company account seeing this is the only
              // one here — telling them to switch profile type would be wrong.
              <EmptyState
                icon={Building2}
                title={tr("No companies yet")}
                description={
                  currentUserIsCompany
                    ? tr(
                        "Yours is the only one so far. More list themselves as the community grows — the founder directory is where to meet people meanwhile.",
                      )
                    : tr(
                        "Be the first company to list. Switch your profile type to Company in onboarding so others can find you.",
                      )
                }
                // /browse, not /founders: this page is founder-only (absent from
                // the investor allowlist in lib/investor-routes.ts, and the
                // middleware bounces investors off it), so the real directory is
                // always right here — /founders is the truncated public preview.
                action={
                  currentUserIsCompany ? (
                    <LinkButton href="/browse" size="sm" variant="secondary">
                      {tr("Browse founders")}
                    </LinkButton>
                  ) : (
                    <LinkButton href="/onboarding" size="sm">
                      {tr("Set up a company profile")}
                    </LinkButton>
                  )
                }
              />
            ) : (
              // The companies exist — the search/filters just hid them.
              <EmptyState
                icon={Building2}
                title={tr("Nothing matches")}
                description={tr(
                  "Try clearing some filters or changing your search.",
                )}
                action={
                  <Button size="sm" variant="secondary" onClick={clearFilters}>
                    {tr("Clear filters ({n})").replace(
                      "{n}",
                      String(activeFilters),
                    )}
                  </Button>
                }
              />
            )
          ) : (
            <div className="space-y-4">
              {filtered.map((c) => (
                <CompanyCard
                  key={c.id}
                  c={c}
                  canRequest={currentUserIsCompany}
                  onRequest={() => setRequestTarget(c)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {requestTarget && (
        <PartnershipRequestDialog
          target={requestTarget}
          fromCompanyName={currentUserCompanyName}
          onClose={() => setRequestTarget(null)}
        />
      )}
    </Section>
  );
}

// ---- Sub-components ----------------------------------------------

function FilterChip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 text-xs tracking-wide border transition-colors ${
        selected
          ? "bg-navy border-navy text-white"
          : "bg-white border-line text-ink hover:border-navy"
      }`}
    >
      {children}
    </button>
  );
}

function CompanyCard({
  c,
  canRequest,
  onRequest,
}: {
  c: CompanyProfile;
  canRequest: boolean;
  onRequest: () => void;
}) {
  const tr = useT();
  const locale = useLocale();
  const fresh = isWithinMs(c.created_at, 7 * DAY_MS);

  return (
    <div className="bg-white p-6 rounded-3xl shadow-xs hover:shadow-sm transition-shadow">
      <div className="flex items-start gap-5">
        <Link href={`/profile/${c.slug}`} className="shrink-0">
          <Avatar name={c.company_name} url={c.photo_url} size="lg" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2 flex-wrap">
            <div className="min-w-0">
              <Link
                href={`/profile/${c.slug}`}
                className="group inline-flex items-center gap-1.5 flex-wrap"
              >
                <h3 className="text-xl leading-tight group-hover:text-gold-ink transition-colors">
                  {c.company_name}
                </h3>
                {c.verified && (
                  <BadgeCheck
                    className="w-4 h-4 text-gold-ink shrink-0"
                    strokeWidth={2}
                  />
                )}
                {fresh && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs uppercase tracking-[0.15em] border border-line text-gold-ink rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse" />
                    {tr("New")}
                  </span>
                )}
              </Link>
              <div className="text-xs text-ink-muted mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                {tr("Rep")}: {c.representative}
                {c.location && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {provinceLabel(c.location, locale)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {c.status_tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {c.status_tags.map((t) => {
                const label = STATUS_TAG_LABEL[t];
                if (!label) return null;
                return (
                  <span
                    key={t}
                    className="text-xs uppercase tracking-[0.15em] px-2 py-0.5 border border-line text-gold-ink bg-gold-soft rounded-full"
                  >
                    {tr(label)}
                  </span>
                );
              })}
            </div>
          )}

          {c.pitch && (
            <p className="text-sm text-ink leading-relaxed mb-4 line-clamp-2">
              {c.pitch}
            </p>
          )}

          {c.capabilities.length > 0 && (
            <div className="mb-3">
              <div className="text-xs uppercase tracking-[0.2em] text-gold-ink mb-1.5">
                {tr("Offers")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.capabilities.slice(0, 8).map((cap) => (
                  <span
                    key={cap}
                    className="text-xs px-2 py-0.5 bg-cream border border-line text-ink rounded-full"
                  >
                    {cap}
                  </span>
                ))}
                {c.capabilities.length > 8 && (
                  <span className="text-xs text-ink-muted px-1">
                    +{c.capabilities.length - 8}
                  </span>
                )}
              </div>
            </div>
          )}

          {c.partnership_seeking.length > 0 && (
            <div className="mb-4">
              <div className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-1.5">
                {tr("Seeking")}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {c.partnership_seeking.slice(0, 8).map((s) => (
                  <span
                    key={s}
                    className="text-xs px-2 py-0.5 bg-gold-soft border border-line text-gold-ink rounded-full"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 pt-3 border-t border-line">
            <Link
              href={`/profile/${c.slug}`}
              className="text-sm text-navy hover:text-gold-ink inline-flex items-center gap-1"
            >
              {tr("Full profile")}
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            {canRequest && (
              <button
                type="button"
                onClick={onRequest}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
              >
                <HandshakeIcon className="w-3.5 h-3.5" />
                {tr("Send partnership request")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
