"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, BadgeCheck, Building2, MapPin } from "lucide-react";
import {
  complementScore,
  type ProfileLike,
  ROLE_LABELS,
  INTENT_LABELS,
  STAGE_LABELS,
  COMMITMENT_LABELS,
} from "@/lib/matching";
import { Avatar } from "@/components/Avatar";
import { useT } from "@/lib/i18n-client";

type Profile = ProfileLike & {
  id: string;
  full_name: string;
  age: number | null;
  photo_url: string | null;
  verified: boolean;
  pitch: string | null;
  skills: string[];
  type: "individual" | "company";
  company_name: string | null;
  capabilities: string[];
};

type TypeFilter = "all" | "individual" | "company";

type Props = {
  me: ProfileLike;
  myReady: boolean;
  others: Profile[];
};

const ROLE_OPTIONS = Object.entries(ROLE_LABELS);
const STAGE_OPTIONS = Object.entries(STAGE_LABELS);
const COMMITMENT_OPTIONS = Object.entries(COMMITMENT_LABELS);
const INDUSTRY_OPTIONS = [
  "FinTech",
  "HealthTech",
  "E-commerce",
  "SaaS",
  "AI / ML",
  "PropTech",
  "Consumer",
  "EdTech",
  "Logistics",
  "Sustainability",
  "Media / Content",
  "Travel",
  "Food & Beverage",
];

export function BrowseClient({ me, myReady, others }: Props) {
  const tr = useT();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [industryFilters, setIndustryFilters] = useState<string[]>([]);
  const [stageFilter, setStageFilter] = useState<string>("");
  const [commitmentFilter, setCommitmentFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");

  const scored = useMemo(() => {
    return others
      .map((p) => ({ profile: p, score: complementScore(me, p) }))
      .sort((a, b) => b.score - a.score);
  }, [me, others]);

  const filtered = useMemo(() => {
    return scored.filter(({ profile: p }) => {
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
      if (roleFilters.length > 0 && (!p.i_am || !roleFilters.includes(p.i_am)))
        return false;
      if (
        industryFilters.length > 0 &&
        !industryFilters.some((i) => p.industry.includes(i))
      )
        return false;
      if (stageFilter && p.stage !== stageFilter) return false;
      if (commitmentFilter && p.commitment !== commitmentFilter) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      return true;
    });
  }, [
    scored,
    searchTerm,
    roleFilters,
    industryFilters,
    stageFilter,
    commitmentFilter,
    typeFilter,
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
    setTypeFilter("all");
  }

  const activeFilterCount =
    roleFilters.length +
    industryFilters.length +
    (stageFilter ? 1 : 0) +
    (commitmentFilter ? 1 : 0) +
    (searchTerm ? 1 : 0) +
    (typeFilter !== "all" ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-10 py-10">
      <div className="mb-10 pb-8 border-b border-line">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
              {tr("The directory")}
            </div>
            <h1 className="text-4xl lg:text-5xl mb-2">
              {tr("Founder directory")}
            </h1>
            <p className="text-ink">
              {filtered.length} {tr("founders")}
              {!myReady && (
                <span className="text-ink-muted ml-2">
                  &middot; {tr("complete your profile for complement scores")}
                </span>
              )}
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

        {myReady && (
          <div className="mt-6 bg-cream border-l-2 border-gold p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-gold mb-1.5">
              {tr("About the Complement Score")}
            </div>
            <p className="text-sm text-ink leading-relaxed">
              {tr("A 0–100 score measuring how well two founders fit:")}{" "}
              <strong className="text-navy">{tr("role complementarity 40%")}</strong>
              ,{" "}
              <strong className="text-navy">{tr("intent 30%")}</strong>,{" "}
              <strong className="text-navy">{tr("industry 15%")}</strong>,{" "}
              <strong className="text-navy">{tr("stage 10%")}</strong>,{" "}
              <strong className="text-navy">{tr("location + commitment 5%")}</strong>
              . {tr("Higher = better starting point for a conversation.")}
            </p>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-12 gap-10">
        {/* Filter sidebar */}
        <aside className="lg:col-span-3">
          <div className="lg:sticky lg:top-6 space-y-8">
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

            <FilterGroup label={tr("Profile type")}>
              <FilterChip
                selected={typeFilter === "all"}
                onClick={() => setTypeFilter("all")}
              >
                {tr("All")}
              </FilterChip>
              <FilterChip
                selected={typeFilter === "individual"}
                onClick={() => setTypeFilter("individual")}
              >
                {tr("Individuals")}
              </FilterChip>
              <FilterChip
                selected={typeFilter === "company"}
                onClick={() => setTypeFilter("company")}
              >
                {tr("Companies")}
              </FilterChip>
            </FilterGroup>

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
        </aside>

        {/* Results */}
        <div className="lg:col-span-9">
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
              {filtered.map(({ profile, score }) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  score={score}
                  showScore={myReady}
                />
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

function ProfileCard({
  profile,
  score,
  showScore,
}: {
  profile: Profile;
  score: number;
  showScore: boolean;
}) {
  return (
    <Link
      href={`/profile/${profile.id}`}
      className="block bg-white border border-line p-6 hover:border-navy transition-colors group"
    >
      <div className="flex items-start gap-5">
        <Avatar
          name={profile.full_name}
          url={profile.photo_url}
          size="lg"
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <h3 className="font-serif text-xl text-navy leading-tight inline-flex items-center gap-1.5">
                {profile.type === "company" && profile.company_name
                  ? profile.company_name
                  : profile.full_name}
                {profile.verified && (
                  <BadgeCheck
                    className="w-4 h-4 text-gold shrink-0"
                    strokeWidth={2}
                  />
                )}
                {profile.type === "company" && (
                  <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.15em] border border-gold/60 text-gold">
                    <Building2 className="w-2.5 h-2.5" strokeWidth={2} />
                    Company
                  </span>
                )}
                {profile.age && profile.type !== "company" && (
                  <span className="text-ink-muted text-base font-sans">
                    , {profile.age}
                  </span>
                )}
              </h3>
              <div className="text-sm text-ink-muted mt-1">
                {profile.type === "company"
                  ? `Represented by ${profile.full_name}`
                  : profile.i_am && ROLE_LABELS[profile.i_am]}
                {profile.intent && (
                  <>
                    {" "}
                    &middot;{" "}
                    <span className="text-gold">
                      {INTENT_LABELS[profile.intent]}
                    </span>
                  </>
                )}
              </div>
            </div>

            {showScore && (
              <div
                className="text-right shrink-0"
                title="How well this founder's profile fits yours: role complementarity 40%, intent 30%, industry 15%, stage 10%, location/commitment 5%"
              >
                <div className="font-serif text-3xl text-gold leading-none">
                  {score}
                </div>
                <div className="text-[10px] uppercase tracking-[0.15em] text-ink-muted mt-1">
                  Complement
                </div>
              </div>
            )}
          </div>

          {profile.pitch && (
            <p className="text-sm text-ink leading-relaxed mb-3 line-clamp-3">
              {profile.pitch}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-muted">
            {profile.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {profile.location}
              </span>
            )}
            {profile.industry.slice(0, 3).map((i) => (
              <span key={i} className="px-2 py-0.5 border border-line">
                {i}
              </span>
            ))}
            {profile.industry.length > 3 && (
              <span className="text-ink-muted">
                +{profile.industry.length - 3}
              </span>
            )}
            {profile.stage && (
              <span className="ml-auto inline-flex items-center gap-1 text-navy group-hover:text-gold">
                View profile <ArrowRight className="w-3 h-3" />
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
