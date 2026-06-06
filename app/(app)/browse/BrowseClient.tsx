"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronDown,
  Hammer,
  MapPin,
  Search,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import {
  type ProfileLike,
  ROLE_LABELS,
  INTENT_LABELS,
  STAGE_LABELS,
  COMMITMENT_LABELS,
} from "@/lib/matching";
import { Avatar } from "@/components/Avatar";
import { useT, useLocale } from "@/lib/i18n-client";
import { provinceLabel } from "@/lib/provinces";
import { INDUSTRIES } from "@/lib/industries";

type Profile = ProfileLike & {
  id: string;
  slug: string;
  full_name: string;
  age: number | null;
  photo_url: string | null;
  verified: boolean;
  pitch: string | null;
  skills: string[];
  type: "individual" | "company";
  company_name: string | null;
  capabilities: string[];
  created_at: string;
};

type Props = {
  others: Profile[];
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);
const STAGE_OPTIONS = Object.entries(STAGE_LABELS);
const COMMITMENT_OPTIONS = Object.entries(COMMITMENT_LABELS);
const INDUSTRY_OPTIONS = INDUSTRIES;

export function BrowseClient({ others }: Props) {
  const tr = useT();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [industryFilters, setIndustryFilters] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<string>("");
  const [commitmentFilter, setCommitmentFilter] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const sorted = useMemo(
    () =>
      [...others].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      ),
    [others],
  );

  const filtered = useMemo(() => {
    return sorted.filter((p) => {
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        const hay = [
          p.full_name,
          p.company_name ?? "",
          p.pitch ?? "",
          ...p.capabilities,
          ...p.skills,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (roleFilters.length > 0 && !roleFilters.some((r) => p.i_am.includes(r)))
        return false;
      if (
        industryFilters.length > 0 &&
        !industryFilters.some((i) => p.industry.includes(i))
      )
        return false;
      if (stageFilter && p.stage !== stageFilter) return false;
      if (commitmentFilter && p.commitment !== commitmentFilter) return false;
      return true;
    });
  }, [
    sorted,
    searchTerm,
    roleFilters,
    industryFilters,
    stageFilter,
    commitmentFilter,
  ]);

  function toggleRole(v: string) {
    setRoleFilters((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }
  function toggleIndustry(v: string) {
    setIndustryFilters((s) =>
      s.includes(v) ? s.filter((x) => x !== v) : [...s, v],
    );
  }
  function clearAll() {
    setSearchTerm("");
    setRoleFilters([]);
    setIndustryFilters([]);
    setStageFilter("");
    setCommitmentFilter("");
  }

  const filterCount =
    roleFilters.length +
    industryFilters.length +
    (stageFilter ? 1 : 0) +
    (commitmentFilter ? 1 : 0);

  const activeFilterCount =
    roleFilters.length +
    industryFilters.length +
    (stageFilter ? 1 : 0) +
    (commitmentFilter ? 1 : 0) +
    (searchTerm ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-10 pb-8 border-b border-line">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-4xl lg:text-5xl mb-2">{tr("All founders")}</h1>
            <p className="text-ink">
              {filtered.length}{" "}
              {tr(filtered.length === 1 ? "founder" : "founders")}
            </p>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={clearAll}
              className="text-sm text-ink-muted hover:text-navy tracking-wide"
            >
              {tr("Clear all filters")}
            </button>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Filter sidebar */}
        <aside className="lg:col-span-3 min-w-0">
          <div className="lg:sticky lg:top-6 space-y-4">
            <div>
              <label
                htmlFor="search"
                className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
              >
                {tr("Search")}
              </label>
              <input
                id="search"
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={tr("Name or keyword")}
                className="w-full px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 border border-line bg-white text-sm text-ink hover:border-navy transition-colors"
              aria-expanded={filtersOpen}
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal
                  className="w-4 h-4 text-ink-muted"
                  strokeWidth={1.5}
                />
                {tr("Filters")}
                {filterCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 text-[10px] bg-gold text-white inline-flex items-center justify-center font-medium">
                    {filterCount}
                  </span>
                )}
              </span>
              <ChevronDown
                className={`w-4 h-4 text-ink-muted transition-transform ${
                  filtersOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <div className={filtersOpen ? "space-y-6" : "hidden"}>
              <FilterGroup label={tr("Looking for (Role)")}>
              {ROLE_OPTIONS.map(([value, label]) => (
                <FilterChip
                  key={value}
                  selected={roleFilters.includes(value)}
                  onClick={() => toggleRole(value)}
                >
                  {tr(label)}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label={tr("Industry")}>
              <div className="flex flex-wrap gap-1.5">
                {INDUSTRY_OPTIONS.map((i) => (
                  <FilterChip
                    key={i}
                    selected={industryFilters.includes(i)}
                    onClick={() => toggleIndustry(i)}
                    compact
                  >
                    {i}
                  </FilterChip>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label={tr("Stage")}>
              {STAGE_OPTIONS.map(([value, label]) => (
                <FilterChip
                  key={value}
                  selected={stageFilter === value}
                  onClick={() =>
                    setStageFilter(stageFilter === value ? "" : value)
                  }
                >
                  {tr(label)}
                </FilterChip>
              ))}
            </FilterGroup>

            <FilterGroup label={tr("Commitment")}>
              {COMMITMENT_OPTIONS.map(([value, label]) => (
                <FilterChip
                  key={value}
                  selected={commitmentFilter === value}
                  onClick={() =>
                    setCommitmentFilter(commitmentFilter === value ? "" : value)
                  }
                >
                  {tr(label)}
                </FilterChip>
              ))}
            </FilterGroup>
            </div>
          </div>
        </aside>

        {/* Results */}
        <div className="lg:col-span-9 min-w-0">
          {filtered.length === 0 ? (
            <div className="bg-white border border-line p-12 text-center">
              <h3 className="text-2xl mb-2">{tr("No matches yet")}</h3>
              <p className="text-ink-muted">
                {tr(
                  "Try widening your filters, or check back as more founders onboard.",
                )}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filtered.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---- Sub-components ------------------------------------------------

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterChip({
  children,
  selected,
  onClick,
  compact,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${compact ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} tracking-wide transition-colors border ${
        selected
          ? "bg-navy border-navy text-white"
          : "bg-white border-line text-ink hover:border-navy"
      }`}
    >
      {children}
    </button>
  );
}

function LabeledRow({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[96px_1fr] gap-1 sm:gap-3">
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gold leading-tight sm:pt-1">
        {Icon && <Icon className="w-3 h-3" strokeWidth={2} />}
        {label}
      </div>
      <div className="min-w-0 text-sm text-ink">{children}</div>
    </div>
  );
}

function ProfileCard({ profile }: { profile: Profile }) {
  const locale = useLocale();
  const tr = useT();
  const isCompany = profile.type === "company";
  const isNew =
    Date.now() - new Date(profile.created_at).getTime() < 7 * 86400_000;
  const roles = (profile.i_am ?? [])
    .map((r) => tr(ROLE_LABELS[r]))
    .filter(Boolean);
  const intent = (profile.intent ?? [])
    .map((x) => tr(INTENT_LABELS[x]))
    .filter(Boolean);
  const lookingFor = (profile.looking_for ?? [])
    .map((r) => tr(ROLE_LABELS[r]))
    .filter(Boolean);
  return (
    <Link
      href={`/profile/${profile.slug}`}
      className="group block bg-white border border-line hover:border-navy transition-colors"
    >
      <div className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6">
        <Avatar name={profile.full_name} url={profile.photo_url} size="lg" />

        <div className="flex-1 min-w-0">
          {/* Who */}
          <h3 className="font-serif text-xl text-navy leading-tight inline-flex items-center gap-1.5 flex-wrap group-hover:text-gold transition-colors">
            {isCompany && profile.company_name
              ? profile.company_name
              : profile.full_name}
            {profile.verified && (
              <BadgeCheck
                className="w-4 h-4 text-gold shrink-0"
                strokeWidth={2}
              />
            )}
            {isNew && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] border border-gold text-gold font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" />
                {tr("New")}
              </span>
            )}
            {isCompany && (
              <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.15em] border border-gold/60 text-gold">
                <Building2 className="w-2.5 h-2.5" strokeWidth={2} />
                {tr("Company")}
              </span>
            )}
            {profile.age && !isCompany && (
              <span className="text-ink-muted text-base font-sans">
                , {profile.age}
              </span>
            )}
          </h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-ink-muted">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" />{" "}
                {provinceLabel(profile.location, locale)}
              </span>
            )}
            {intent.length > 0 && (
              <span className="text-gold">{intent.join(" · ")}</span>
            )}
          </div>

          {/* What — each row a distinct visual form:
              Role = navy chips (who they are), Building = prose (what they do),
              Looking for = gold chips (what they want). */}
          <div className="mt-4 space-y-3">
            {isCompany ? (
              <LabeledRow label={tr("Represented by")} icon={Briefcase}>
                <span className="font-medium text-navy">
                  {profile.full_name}
                </span>
              </LabeledRow>
            ) : (
              roles.length > 0 && (
                <LabeledRow label={tr("Role")} icon={UserRound}>
                  <div className="flex flex-wrap gap-1.5">
                    {roles.map((r) => (
                      <span
                        key={r}
                        className="px-2 py-0.5 text-xs border border-navy/25 text-navy bg-navy/[0.03]"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </LabeledRow>
              )
            )}
            {profile.pitch && (
              <LabeledRow label={tr("Building")} icon={Hammer}>
                <p className="line-clamp-2 leading-relaxed text-ink">
                  {profile.pitch}
                </p>
              </LabeledRow>
            )}
            {!isCompany && lookingFor.length > 0 && (
              <LabeledRow label={tr("Looking for")} icon={Search}>
                <div className="flex flex-wrap gap-1.5">
                  {lookingFor.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 text-xs border border-gold/50 text-gold bg-gold/5"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              </LabeledRow>
            )}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-ink-muted mt-4 pt-4 border-t border-line">
            {profile.industry.slice(0, 3).map((i) => (
              <span key={i} className="px-2 py-0.5 border border-line">
                {i}
              </span>
            ))}
            {profile.industry.length > 3 && (
              <span>+{profile.industry.length - 3}</span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-navy group-hover:text-gold transition-colors">
              {tr("View profile")} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
