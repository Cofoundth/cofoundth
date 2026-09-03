"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Briefcase,
  Building2,
  ChevronDown,
  ExternalLink,
  GraduationCap,
  Hammer,
  Image as ImageIcon,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  UserRound,
  Users,
} from "lucide-react";
import {
  type ProfileLike,
  ROLE_LABELS,
  INTENT_LABELS,
  STAGE_LABELS,
  COMMITMENT_LABELS,
} from "@/lib/matching";
import { Avatar } from "@/components/Avatar";
import { Button, EmptyState, LinkButton } from "@/components/ui";
import { useT, useLocale } from "@/lib/i18n-client";
import { provinceLabel } from "@/lib/provinces";
import { INDUSTRIES } from "@/lib/industries";
import Combobox from "@/components/Combobox";
import { ACTIVITIES } from "@/lib/activities";
import { HELP_TOPICS } from "@/lib/help-topics";
import { BUILDING_SINCE_LABELS, AGE_BANDS } from "@/lib/matching";
import { isWithinMs, DAY_MS } from "@/lib/time";

type Profile = ProfileLike & {
  id: string;
  slug: string;
  full_name: string;
  age: number | null;
  photo_url: string | null;
  verified: boolean;
  pitch: string | null;
  skills: string[];
  activities: string[];
  help_with: string[];
  needs_help_with: string[];
  building_since: string | null;
  project_url: string | null;
  project_images: string[];
  work_experience: string | null;
  background: string | null;
  education: string | null;
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
  const [activityFilters, setActivityFilters] = useState<string[]>([]);
  const [helpFilters, setHelpFilters] = useState<string[]>([]);
  const [needsFilters, setNeedsFilters] = useState<string[]>([]);
  const [buildingFilter, setBuildingFilter] = useState<string>("");
  const [ageBandFilter, setAgeBandFilter] = useState<string>("");
  // Mobile-only collapse. On lg+ the panel is always shown via CSS (and the
  // toggle is hidden) — a breakpoint-aware initial state would hydrate wrong.
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Top-level split: founders who already have an idea vs. those still exploring.
  const [ideaTab, setIdeaTab] = useState<"idea" | "exploring">("idea");

  const sorted = useMemo(
    () =>
      [...others].sort((a, b) =>
        (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      ),
    [others],
  );

  // Everything except the idea/exploring tab — so the tab counts reflect the
  // other active filters.
  const filteredBase = useMemo(() => {
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
      if (
        activityFilters.length > 0 &&
        !activityFilters.some((a) => p.activities.includes(a))
      )
        return false;
      if (
        helpFilters.length > 0 &&
        !helpFilters.some((h) => p.help_with.includes(h))
      )
        return false;
      if (
        needsFilters.length > 0 &&
        !needsFilters.some((h) => p.needs_help_with.includes(h))
      )
        return false;
      if (buildingFilter && p.building_since !== buildingFilter) return false;
      if (ageBandFilter) {
        const band = AGE_BANDS.find((b) => b.key === ageBandFilter);
        // A profile with no age is excluded rather than assumed — guessing would
        // put people in a band they never chose.
        if (!band || p.age == null || p.age < band.min || p.age > band.max)
          return false;
      }
      return true;
    });
  }, [
    sorted,
    searchTerm,
    roleFilters,
    industryFilters,
    activityFilters,
    helpFilters,
    needsFilters,
    buildingFilter,
    ageBandFilter,
    stageFilter,
    commitmentFilter,
  ]);

  const ideaCount = useMemo(
    () => filteredBase.filter((p) => (p.intent ?? []).includes("idea")).length,
    [filteredBase],
  );
  const exploringCount = filteredBase.length - ideaCount;

  const filtered = useMemo(
    () =>
      filteredBase.filter(
        (p) => (p.intent ?? []).includes("idea") === (ideaTab === "idea"),
      ),
    [filteredBase, ideaTab],
  );

  function toggleRole(v: string) {
    setRoleFilters((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  }
  function toggleIndustry(v: string) {
    setIndustryFilters((s) =>
      s.includes(v) ? s.filter((x) => x !== v) : [...s, v],
    );
  }
  // Combobox matches the visible string, so Thai readers get Thai options and
  // the pick maps back to the canonical English value the column stores.
  const activityByLabel = useMemo(
    () => new Map(ACTIVITIES.map((a) => [tr(a), a])),
    [tr],
  );
  const helpByLabel = useMemo(
    () => new Map(HELP_TOPICS.map((h) => [tr(h), h])),
    [tr],
  );

  function toggleActivity(v: string) {
    setActivityFilters((s) =>
      s.includes(v) ? s.filter((x) => x !== v) : [...s, v],
    );
  }
  function toggleHelp(v: string) {
    setHelpFilters((s) =>
      s.includes(v) ? s.filter((x) => x !== v) : [...s, v],
    );
  }
  function toggleNeeds(v: string) {
    setNeedsFilters((s) =>
      s.includes(v) ? s.filter((x) => x !== v) : [...s, v],
    );
  }
  function clearAll() {
    setSearchTerm("");
    setRoleFilters([]);
    setIndustryFilters([]);
    setStageFilter("");
    setCommitmentFilter("");
    setActivityFilters([]);
    setHelpFilters([]);
    setNeedsFilters([]);
    setBuildingFilter("");
    setAgeBandFilter("");
  }

  const filterCount =
    roleFilters.length +
    industryFilters.length +
    activityFilters.length +
    helpFilters.length +
    needsFilters.length +
    (buildingFilter ? 1 : 0) +
    (ageBandFilter ? 1 : 0) +
    (stageFilter ? 1 : 0) +
    (commitmentFilter ? 1 : 0);

  const activeFilterCount =
    roleFilters.length +
    industryFilters.length +
    activityFilters.length +
    helpFilters.length +
    needsFilters.length +
    (buildingFilter ? 1 : 0) +
    (ageBandFilter ? 1 : 0) +
    (stageFilter ? 1 : 0) +
    (commitmentFilter ? 1 : 0) +
    (searchTerm ? 1 : 0);

  return (
    <div className="max-w-[1120px] mx-auto px-6 lg:px-10 py-[88px]">
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-d3 mb-2">{tr("All founders")}</h1>
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

      <div className="flex gap-6 border-b border-line mb-8">
        {(
          [
            ["idea", tr("Has an idea"), ideaCount],
            ["exploring", tr("Exploring"), exploringCount],
          ] as const
        ).map(([key, label, count]) => (
          <button
            key={key}
            type="button"
            onClick={() => setIdeaTab(key)}
            className={`pb-3 -mb-px text-sm tracking-wide border-b-2 transition-colors ${
              ideaTab === key
                ? "border-navy text-navy font-medium"
                : "border-transparent text-ink-muted hover:text-navy"
            }`}
          >
            {label}{" "}
            <span className="text-xs text-ink-muted">({count})</span>
          </button>
        ))}
      </div>

      <div className="grid xl:grid-cols-12 gap-10">
        {/* Filter sidebar */}
        <aside className="xl:col-span-3 min-w-0">
          <div className="xl:sticky xl:top-6 xl:max-h-[calc(100vh-3rem)] xl:overflow-y-auto space-y-4 pr-1">
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
                aria-label={tr("Search founders")}
                placeholder={tr("Name or keyword")}
                className="w-full px-4 py-3 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
              />
            </div>

            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="lg:hidden w-full flex items-center justify-between px-4 py-3 border border-line bg-white text-sm text-ink hover:border-navy transition-colors rounded-xl"
              aria-expanded={filtersOpen}
              aria-controls="browse-filters"
            >
              <span className="inline-flex items-center gap-2">
                <SlidersHorizontal
                  className="w-4 h-4 text-ink-muted"
                  strokeWidth={1.5}
                />
                {tr("Filters")}
                {filterCount > 0 && (
                  <span className="min-w-[18px] h-[18px] px-1 text-[10px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium">
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

            <div
              id="browse-filters"
              className={`space-y-6 ${filtersOpen ? "" : "hidden lg:block"}`}
            >
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

            {/* Searchable, not a wall of chips. The industry list widened
                from 31 tech verticals to the full real-economy taxonomy when
                the platform stopped being tech-only, and rendering every
                option as a chip stopped being readable well before that.
                Selected industries stay visible as chips so the active filter
                is never hidden inside a closed menu. */}
            <FilterGroup label={tr("Industry")}>
              {industryFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {industryFilters.map((i) => (
                    <FilterChip
                      key={i}
                      selected
                      onClick={() => toggleIndustry(i)}
                      compact
                    >
                      {i} ×
                    </FilterChip>
                  ))}
                </div>
              )}
              <Combobox
                options={INDUSTRY_OPTIONS.filter(
                  (i) => !industryFilters.includes(i),
                )}
                value=""
                onChange={(v) => {
                  const picked = v.trim();
                  // allowCustom is off, but onChange still fires on blur with
                  // whatever was typed — only accept a real taxonomy value.
                  if (picked && INDUSTRY_OPTIONS.includes(picked)) {
                    toggleIndustry(picked);
                  }
                }}
                placeholder={tr("Search industries")}
                allowCustom={false}
                className="w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none rounded-xl"
                emptyText={tr("No matches")}
              />
            </FilterGroup>

            {/* Outcomes someone can unblock for you — the axis that gives a
                stranger a reason to message. Separate from Skills on purpose. */}
            <FilterGroup label={tr("Can help with")}>
              {helpFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {helpFilters.map((h) => (
                    <FilterChip
                      key={h}
                      selected
                      onClick={() => toggleHelp(h)}
                      compact
                    >
                      {tr(h)} ×
                    </FilterChip>
                  ))}
                </div>
              )}
              <Combobox
                options={HELP_TOPICS.filter(
                  (h) => !helpFilters.includes(h),
                ).map((h) => tr(h))}
                value=""
                onChange={(v) => {
                  const canonical = helpByLabel.get(v.trim());
                  if (canonical) toggleHelp(canonical);
                }}
                placeholder={tr("Search help topics")}
                allowCustom={false}
                className="w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none rounded-xl"
                emptyText={tr("No matches")}
              />
            </FilterGroup>

            {/* The demand side of the same vocabulary. */}
            <FilterGroup label={tr("Needs help with")}>
              {needsFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {needsFilters.map((h) => (
                    <FilterChip
                      key={h}
                      selected
                      onClick={() => toggleNeeds(h)}
                      compact
                    >
                      {tr(h)} ×
                    </FilterChip>
                  ))}
                </div>
              )}
              <Combobox
                options={HELP_TOPICS.filter(
                  (h) => !needsFilters.includes(h),
                ).map((h) => tr(h))}
                value=""
                onChange={(v) => {
                  const canonical = helpByLabel.get(v.trim());
                  if (canonical) toggleNeeds(canonical);
                }}
                placeholder={tr("Search help topics")}
                allowCustom={false}
                className="w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none rounded-xl"
                emptyText={tr("No matches")}
              />
            </FilterGroup>

            {/* What someone would actually DO with you. Feeds meetups. */}
            <FilterGroup label={tr("Activities")}>
              {activityFilters.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {activityFilters.map((a) => (
                    <FilterChip
                      key={a}
                      selected
                      onClick={() => toggleActivity(a)}
                      compact
                    >
                      {tr(a)} ×
                    </FilterChip>
                  ))}
                </div>
              )}
              <Combobox
                options={ACTIVITIES.filter(
                  (a) => !activityFilters.includes(a),
                ).map((a) => tr(a))}
                value=""
                onChange={(v) => {
                  const canonical = activityByLabel.get(v.trim());
                  if (canonical) toggleActivity(canonical);
                }}
                placeholder={tr("Search activities")}
                allowCustom={false}
                className="w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none rounded-xl"
                emptyText={tr("No matches")}
              />
            </FilterGroup>

            <FilterGroup label={tr("How long building")}>
              {Object.entries(BUILDING_SINCE_LABELS).map(([value, label]) => (
                <FilterChip
                  key={value}
                  selected={buildingFilter === value}
                  onClick={() =>
                    setBuildingFilter(buildingFilter === value ? "" : value)
                  }
                >
                  {tr(label)}
                </FilterChip>
              ))}
            </FilterGroup>

            {/* Bands over the existing integer column — no schema of its own. */}
            <FilterGroup label={tr("Age")}>
              {AGE_BANDS.map((b) => (
                <FilterChip
                  key={b.key}
                  selected={ageBandFilter === b.key}
                  onClick={() =>
                    setAgeBandFilter(ageBandFilter === b.key ? "" : b.key)
                  }
                  compact
                >
                  {b.label}
                </FilterChip>
              ))}
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
        <div className="xl:col-span-9 min-w-0">
          {filtered.length === 0 ? (
            <NoResults
              totalOthers={others.length}
              matchingFilters={filteredBase.length}
              ideaTab={ideaTab}
              onClear={clearAll}
              onSwitchTab={() =>
                setIdeaTab(ideaTab === "idea" ? "exploring" : "idea")
              }
            />
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

// The directory is empty for three different reasons, and only ONE of them is
// "nobody is here yet". Offering "be the first" to someone whose industry
// filter is simply too narrow would be nonsense, so each case gets the action
// that actually unblocks it.
function NoResults({
  totalOthers,
  matchingFilters,
  ideaTab,
  onClear,
  onSwitchTab,
}: {
  /** Every other founder in the directory, before search/filters/tab. */
  totalOthers: number;
  /** After search + filters, BEFORE the idea/exploring tab split. */
  matchingFilters: number;
  ideaTab: "idea" | "exploring";
  onClear: () => void;
  onSwitchTab: () => void;
}) {
  const tr = useT();

  // Nothing exists yet — the only real directory this early is the forum.
  if (totalOthers === 0) {
    return (
      <EmptyState
        icon={Users}
        title={tr("You're the first one here")}
        description={tr(
          "No other founders have finished a profile yet. Post what you're building in the community — that's where the next ones land first, and they'll find you there.",
        )}
        action={
          <LinkButton href="/community">
            {tr("Say hello in the community")}
          </LinkButton>
        }
      />
    );
  }

  // The founders exist; the search/filter combination hides them.
  if (matchingFilters === 0) {
    return (
      <EmptyState
        icon={SlidersHorizontal}
        title={tr("No founders match these filters")}
        description={tr(
          "Nothing fits this combination. Widen it, or clear the filters and read the whole directory.",
        )}
        action={
          <Button variant="secondary" onClick={onClear}>
            {tr("Clear all filters")}
          </Button>
        }
      />
    );
  }

  // The founders exist and pass the filters — they are all under the other tab.
  return (
    <EmptyState
      icon={Users}
      title={
        ideaTab === "idea"
          ? tr("No founders with an idea right now")
          : tr("No founders exploring right now")
      }
      description={tr("Everyone showing at the moment is under the other tab.")}
      action={
        <Button variant="secondary" onClick={onSwitchTab}>
          {ideaTab === "idea"
            ? tr("Switch to Exploring")
            : tr("Switch to Has an idea")}
        </Button>
      }
    />
  );
}

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
      <div className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-gold-ink leading-tight sm:pt-1">
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
  const isNew = isWithinMs(profile.created_at, 7 * DAY_MS);
  const roles = (profile.i_am ?? [])
    .map((r) => tr(ROLE_LABELS[r]))
    .filter(Boolean);
  const intent = (profile.intent ?? [])
    .map((x) => tr(INTENT_LABELS[x]))
    .filter(Boolean);
  const lookingFor = (profile.looking_for ?? [])
    .map((r) => tr(ROLE_LABELS[r]))
    .filter(Boolean);
  // Idea-havers sell the project; explorers sell their track record.
  const hasIdea = (profile.intent ?? []).includes("idea");
  return (
    <Link
      href={`/profile/${profile.slug}`}
      className="group block bg-white rounded-3xl shadow-xs hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-4 sm:gap-5 p-5 sm:p-6">
        <Avatar name={profile.full_name} url={profile.photo_url} size="lg" />

        <div className="flex-1 min-w-0">
          {/* Who */}
          <h3 className="text-xl leading-tight inline-flex items-center gap-1.5 flex-wrap group-hover:text-gold-ink transition-colors">
            {isCompany && profile.company_name
              ? profile.company_name
              : profile.full_name}
            {profile.verified && (
              <BadgeCheck
                className="w-4 h-4 text-gold-ink shrink-0"
                strokeWidth={2}
              />
            )}
            {isNew && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] border border-line text-gold-ink font-sans rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse motion-reduce:animate-none" />
                {tr("New")}
              </span>
            )}
            {isCompany && (
              <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.15em] border border-line text-gold-ink rounded-full">
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
              <span className="text-gold-ink">{intent.join(" · ")}</span>
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
                        className="px-2 py-0.5 text-xs border border-navy/25 text-navy bg-navy/[0.03] rounded-full"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </LabeledRow>
              )
            )}
            {isCompany ? (
              profile.pitch && (
                <LabeledRow label={tr("Pitch")} icon={Hammer}>
                  <p className="leading-relaxed text-ink whitespace-pre-wrap">
                    {profile.pitch}
                  </p>
                </LabeledRow>
              )
            ) : hasIdea ? (
              <>
                {profile.pitch && (
                  <LabeledRow label={tr("Pitch")} icon={Hammer}>
                    <p className="leading-relaxed text-ink whitespace-pre-wrap">
                      {profile.pitch}
                    </p>
                  </LabeledRow>
                )}
                {(profile.project_url ||
                  profile.project_images.length > 0) && (
                  <LabeledRow label={tr("Project")} icon={ImageIcon}>
                    <div className="space-y-2">
                      {profile.project_images.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {profile.project_images.map((url, i) => (
                            <div
                              key={i}
                              className="w-20 h-14 overflow-hidden border border-line shrink-0 bg-cream rounded-xl"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt=""
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                      {profile.project_url && (
                        <span className="inline-flex items-center gap-1 text-xs text-navy break-all">
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          {profile.project_url}
                        </span>
                      )}
                    </div>
                  </LabeledRow>
                )}
              </>
            ) : (
              <>
                {(profile.work_experience || profile.background) && (
                  <LabeledRow label={tr("Experience")} icon={Briefcase}>
                    <p className="leading-relaxed text-ink whitespace-pre-wrap">
                      {profile.work_experience || profile.background}
                    </p>
                  </LabeledRow>
                )}
                {profile.skills.length > 0 && (
                  <LabeledRow label={tr("Skills")} icon={Sparkles}>
                    <div className="flex flex-wrap gap-1.5">
                      {profile.skills.slice(0, 6).map((s) => (
                        <span
                          key={s}
                          className="px-2 py-0.5 text-xs border border-line text-ink rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </LabeledRow>
                )}
              </>
            )}
            {!isCompany && profile.education && (
              <LabeledRow label={tr("Education")} icon={GraduationCap}>
                <p className="leading-relaxed text-ink whitespace-pre-wrap">
                  {profile.education}
                </p>
              </LabeledRow>
            )}
            {!isCompany && lookingFor.length > 0 && (
              <LabeledRow label={tr("Looking for")} icon={Search}>
                <div className="flex flex-wrap gap-1.5">
                  {lookingFor.map((r) => (
                    <span
                      key={r}
                      className="px-2 py-0.5 text-xs border border-line text-gold-ink bg-gold-soft rounded-full"
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
              <span key={i} className="px-2 py-0.5 border border-line rounded-full">
                {i}
              </span>
            ))}
            {profile.industry.length > 3 && (
              <span>+{profile.industry.length - 3}</span>
            )}
            <span className="ml-auto inline-flex items-center gap-1 text-navy group-hover:text-gold-ink transition-colors">
              {tr("View profile")} <ArrowRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
