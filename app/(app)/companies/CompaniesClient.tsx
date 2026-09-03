"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  Building2,
  ChevronDown,
  HandshakeIcon,
  MapPin,
  Search as SearchIcon,
  SlidersHorizontal,
} from "lucide-react";
import { Avatar } from "@/components/Avatar";
import {
  Button,
  CardChip,
  CardLabel,
  CardPill,
  EmptyState,
  LinkButton,
  Section,
  SectorList,
  VerifiedBadge,
} from "@/components/ui";
import { STAGE_LABELS } from "@/lib/matching";
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
  const [filtersOpen, setFiltersOpen] = useState(false);

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
      <div className="mb-8">
        <div className="flex items-end justify-between gap-6 flex-wrap">
          <div className="max-w-[640px]">
            {/* "B2B Network" said what the sidebar item already says; Beta is
                real status, so it stays as a chip on the title. */}
            <h1 className="text-d2 flex items-baseline gap-2.5 flex-wrap">
              <span className="inline-flex items-center gap-2.5">
                {tr("Companies in the community")}
                <CardChip>Beta</CardChip>
              </span>
              <span className="text-sm font-normal tracking-normal text-ink-muted">
                {companies.length}{" "}
                {tr(companies.length === 1 ? "company" : "companies")}
              </span>
            </h1>
          </div>
          <Link
            href="/companies/requests"
            className="text-sm text-navy hover:text-gold-ink inline-flex items-center gap-1.5 px-4 py-2 border border-line hover:border-navy transition-colors rounded-xl"
          >
            <HandshakeIcon className="w-4 h-4" strokeWidth={1.5} />
            {tr("Partnership board")}
          </Link>
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

      {/* Search grows, a 48px filter trigger beside it, the filters in a
          panel below — the same pattern /browse runs; the permanent rail
          spent a quarter of the viewport on two chip groups. */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <SearchIcon
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            id="company-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={tr("Search")}
            placeholder={tr("Name, capability…")}
            className="w-full h-12 pl-11 pr-4 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
          />
        </div>
        {/* rounded-xl, not the base layer's pill: it has to agree with the
            input beside it, and a call-site utility beats @layer base. */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="company-filters"
          aria-label={tr("Filters")}
          className="relative h-12 w-12 shrink-0 flex items-center justify-center border border-line bg-white text-ink hover:border-navy transition-colors rounded-xl"
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
          {capabilityFilters.length + seekingFilters.length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium">
              {capabilityFilters.length + seekingFilters.length}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && (
        <div
          id="company-filters"
          className="mb-8 rounded-xl border border-line bg-white"
        >
          <FilterGroup label={tr("Offers")}>
            {capabilities.map((cap) => (
              <FilterChip
                key={cap}
                selected={capabilityFilters.includes(cap)}
                onClick={() => toggle(setCapabilityFilters, cap)}
              >
                {cap}
              </FilterChip>
            ))}
          </FilterGroup>
          <FilterGroup label={tr("Seeking")}>
            {seeking.map((sk) => (
              <FilterChip
                key={sk}
                selected={seekingFilters.includes(sk)}
                onClick={() => toggle(setSeekingFilters, sk)}
              >
                {sk}
              </FilterChip>
            ))}
          </FilterGroup>
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line">
            <span className="text-sm text-ink-muted">
              {filtered.length}{" "}
              {tr(filtered.length === 1 ? "company" : "companies")}
            </span>
            <div className="flex items-center gap-2">
              {activeFilters > 0 && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="px-4 py-2 text-sm text-ink-muted hover:text-navy tracking-wide"
                >
                  {tr("Clear filters ({n})").replace(
                    "{n}",
                    String(activeFilters),
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => setFiltersOpen(false)}
                className="px-5 py-2 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
              >
                {tr("Done")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="min-w-0">
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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

// One accordion row inside the filter panel — /browse's recipe. `rounded-none`
// is deliberate: @layer base pills every <button>, which looks wrong on a
// full-width row inside a bordered card; the call site wins because
// `utilities` is a later cascade layer than `base`.
function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-sm text-ink hover:bg-cream transition-colors rounded-none"
      >
        {label}
        <ChevronDown
          className={`w-4 h-4 text-ink-muted shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
          strokeWidth={1.5}
        />
      </button>
      {open && (
        // pt-1: the header button's py-3 leaves 12px against pb-4's 16 — the
        // same symmetry fix /browse's panel carries.
        <div className="px-4 pt-1 pb-4 flex flex-wrap gap-1.5">{children}</div>
      )}
    </div>
  );
}

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
  const statusTag = c.status_tags
    .map((t) => STATUS_TAG_LABEL[t])
    .filter(Boolean)[0];

  return (
    <div className="group h-full min-w-0 bg-white rounded-3xl shadow-xs hover:shadow-sm transition-shadow p-4 flex flex-col">
      {/* HEADER — logo shares the 48px row; nothing below is indented. */}
      <div className="shrink-0 flex gap-3 items-center">
        <Avatar name={c.company_name} url={c.photo_url} size="md" />
        <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold leading-none">
            <Link
              href={`/profile/${c.slug}`}
              className="truncate hover:text-gold-ink transition-colors"
            >
              {c.company_name}
            </Link>
            {c.verified && <VerifiedBadge label={tr("Verified")} />}
          </h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted overflow-hidden">
            <span className="truncate">{c.representative}</span>
            {c.location && (
              <span className="inline-flex min-w-0 items-center gap-1 shrink-0">
                <MapPin className="w-3 h-3 shrink-0" />
                {provinceLabel(c.location, locale)}
              </span>
            )}
            {fresh && <span className="shrink-0 text-gold-ink">{tr("New")}</span>}
          </div>
        </div>
      </div>

      {/* BODY — reserved rows on the shared skeleton. */}
      <div className="mt-4 flex flex-col gap-4 flex-1 min-h-0">
        <div className="flex h-[21px] items-center gap-2 overflow-hidden">
          {statusTag && <CardPill>{tr(statusTag)}</CardPill>}
          <SectorList
            items={c.industry}
            max={1}
            fallback={
              c.stage && STAGE_LABELS[c.stage]
                ? tr(STAGE_LABELS[c.stage])
                : undefined
            }
          />
        </div>

        {c.pitch && (
          <p className="text-xs leading-relaxed text-ink-muted line-clamp-2 min-h-[39px]">
            {c.pitch}
          </p>
        )}

        {c.capabilities.length > 0 && (
          <div className="flex flex-col gap-1.5 min-w-0">
            <CardLabel>{tr("Offers")}</CardLabel>
            <div className="flex flex-row gap-1.5 overflow-hidden h-[22px]">
              {c.capabilities.slice(0, 3).map((cap) => (
                <CardChip key={cap}>{cap}</CardChip>
              ))}
            </div>
          </div>
        )}

        {c.partnership_seeking.length > 0 && (
          <div className="mt-auto flex flex-col gap-1.5 min-w-0">
            <CardLabel>{tr("Seeking")}</CardLabel>
            <div className="flex flex-row gap-1.5 overflow-hidden h-[22px]">
              {c.partnership_seeking.slice(0, 3).map((sk) => (
                <CardChip key={sk}>{sk}</CardChip>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FOOTER — the /browse card's two-button row: act, or read more. */}
      <div className="pt-4 flex gap-2">
        {canRequest && (
          <button
            type="button"
            onClick={onRequest}
            className="flex-1 rounded-full bg-navy py-2 text-sm text-white tracking-wide hover:bg-navy-dark transition-colors"
          >
            {tr("Send partnership request")}
          </button>
        )}
        <Link
          href={`/profile/${c.slug}`}
          className={`flex-1 rounded-full border border-line py-2 text-sm text-ink text-center tracking-wide hover:border-navy transition-colors`}
        >
          {tr("Full profile")}
        </Link>
      </div>
    </div>
  );
}
