"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  MapPin,
  Search,
  SlidersHorizontal,
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
import { Button, EmptyState, LinkButton, Section } from "@/components/ui";
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
    <Section>
      <div className="mb-8">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-d2 mb-2">{tr("All founders")}</h1>
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

      {/* Search + a filter TRIGGER, with the filters themselves in a panel that
          opens below. Measured off Onfound's /community: a flex row where the
          search grows and a 48x48 icon button sits beside it, then a full-width
          bordered card of accordion groups.

          This replaces a permanent left rail that spent a third of every
          viewport on nine always-open filter groups. Filters are a tool for
          navigating a directory, not the first thing to look at in one. */}
      <div className="flex items-center gap-2 mb-4">
        <div className="relative flex-1 min-w-0">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-muted pointer-events-none"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label={tr("Search founders")}
            placeholder={tr("Name or keyword")}
            className="w-full h-12 pl-11 pr-4 border border-line bg-white text-ink text-sm focus:outline-none focus:border-navy rounded-xl"
          />
        </div>
        {/* rounded-xl, not the base layer's pill: it has to agree with the
            input beside it, and a call-site utility beats @layer base. */}
        <button
          type="button"
          onClick={() => setFiltersOpen((v) => !v)}
          aria-expanded={filtersOpen}
          aria-controls="browse-filters"
          aria-label={tr("Filters")}
          className="relative h-12 w-12 shrink-0 flex items-center justify-center border border-line bg-white text-ink hover:border-navy transition-colors rounded-xl"
        >
          <SlidersHorizontal className="w-4 h-4" strokeWidth={1.5} />
          {filterCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 text-[11px] bg-navy text-white rounded-full inline-flex items-center justify-center font-medium">
              {filterCount}
            </span>
          )}
        </button>
      </div>

      {filtersOpen && (
        <div
          id="browse-filters"
          className="mb-8 rounded-xl border border-line bg-white"
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

          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t border-line">
            <span className="text-sm text-ink-muted">
              {filtered.length} {tr("founders")}
            </span>
            <div className="flex items-center gap-2">
              {filterCount > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  className="px-4 py-2 text-sm text-ink-muted hover:text-navy tracking-wide"
                >
                  {tr("Clear all filters")}
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
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((profile) => (
                <ProfileCard key={profile.id} profile={profile} />
              ))}
            </div>
          )}
      </div>
    </Section>
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

// One accordion row inside the filter panel. Collapsed by default and it owns
// its own open state — nine groups do not need nine pieces of parent state, and
// nothing outside this row cares whether it is expanded.
//
// `rounded-none` is deliberate: @layer base pills every <button>, which looks
// wrong on a full-width row inside a bordered card. The call site wins because
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
        <div className="px-4 pb-4 flex flex-wrap gap-1.5">{children}</div>
      )}
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
    // Stacked, not a label gutter. The 96px column this used to reserve was
    // most of a grid card's usable width.
    <div className="min-w-0">
      <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.16em] text-gold-ink leading-tight mb-1">
        {Icon && <Icon className="w-3 h-3 shrink-0" strokeWidth={2} />}
        {label}
      </div>
      <div className="min-w-0 text-sm text-ink">{children}</div>
    </div>
  );
}

// The name RESERVES two lines (min-h-[58px]) rather than truncating to one.
// Long Thai names and "Woradorn Laodhanadhaworn" wrap at 20px in a 336px
// column, so heights came out 29 / 58 / 59 across a row and nothing else in
// the card could line up. Onfound truncates instead, but their names are 14px
// Latin — cutting a person's name mid-word to save 29px is the worse trade.
//
// The founder grid goes three-up at xl, NOT lg. The design system's card grid
// (sm:2 lg:3) was measured on MARKETING pages, which have no sidebar. App routes
// lose 256px to the rail, so lg:grid-cols-3 gives 219px columns at 1024 —
// narrower than the two-column layout gives at the same width. xl gives 304px.
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
      className="group flex h-full flex-col bg-white rounded-3xl shadow-xs hover:shadow-sm transition-shadow"
    >
      {/* No items-start: the content column must STRETCH for the footer's
          mt-auto to have space to push into, which is what aligns footers
          across a row. The avatar keeps its own size via self-start. */}
      <div className="flex flex-1 gap-3 p-5">
        <Avatar name={profile.full_name} url={profile.photo_url} size="md" />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Who */}
          <h3 className="text-xl leading-tight inline-flex items-center gap-1.5 flex-wrap group-hover:text-gold-ink transition-colors line-clamp-2 min-h-[58px]">
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
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs uppercase tracking-[0.15em] border border-line text-gold-ink font-sans rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-navy animate-pulse motion-reduce:animate-none" />
                {tr("New")}
              </span>
            )}
            {isCompany && (
              <span className="ml-1 inline-flex items-center gap-1 px-1.5 py-0.5 text-xs uppercase tracking-[0.15em] border border-line text-gold-ink rounded-full">
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
          {/* One line, clipped. This wrapped to two lines on cards with a long
                province plus two intents, and that 20px was the last thing
                stopping every card in a row from being identical: meta 16px
                gave a 20px gap before the footer, meta 36px gave 0. The intent
                is already stated by the active tab above the grid. */}
            <div className="mt-1 flex items-center gap-x-2.5 text-xs text-ink-muted h-4 overflow-hidden">
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
            {/* Role is identity, so it sits under the meta line unlabelled.
                As its own labelled section it cost ~60px for three one-word
                chips. */}
            {!isCompany && roles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {roles.slice(0, 3).map((r) => (
                  <span
                    key={r}
                    className="px-2 py-0.5 text-xs border border-navy/25 text-navy bg-navy/[0.03] rounded-full"
                  >
                    {r}
                  </span>
                ))}
              </div>
            )}

          {/* Two blocks, not six. Everything else — project images and link,
              experience, education, skills — is on the profile, one click away.
              A directory card answers "is this worth opening", and Onfound's
              equivalent card carries 12 text nodes against our previous ~40. */}
          <div className="mt-3 space-y-3">
            {isCompany ? (
              profile.pitch && (
                <p className="text-sm leading-relaxed text-ink line-clamp-2 min-h-[45.5px]">
                  {profile.pitch}
                </p>
              )
            ) : (
              <>
                {(hasIdea
                  ? profile.pitch
                  : profile.work_experience || profile.background) && (
                  <p className="text-sm leading-relaxed text-ink line-clamp-2 min-h-[45.5px]">
                    {hasIdea
                      ? profile.pitch
                      : profile.work_experience || profile.background}
                  </p>
                )}
                {lookingFor.length > 0 && (
                  <LabeledRow label={tr("Looking for")} icon={Search}>
                    <div className="flex flex-wrap gap-1.5">
                      {lookingFor.slice(0, 3).map((r) => (
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
              </>
            )}
          </div>

          {/* Rendered on EVERY card, industries or not. Onfound's footer is a
              constant 36px on all of theirs, and a card that simply lacks the
              row is the loudest asymmetry in a grid — one card ending on chips
              while its neighbours end on a bordered row reads as broken.
              Two industries max so it never wraps to a second line. */}
          {/* ONE row, always, at a fixed height. Capping the count was not
              enough — "Software & IT Services" beside "Design & Creative"
              still wrapped, giving footers of 41px and 66px in the same grid.
              nowrap + min-w-0 lets a long name ellipsis instead of wrapping,
              so this row is 41px on every card the way Onfound's is 36px on
              every one of theirs. */}
          <div className="mt-auto pt-4 border-t border-line h-[41px] flex items-center gap-2 text-xs text-ink-muted overflow-hidden">
            {profile.industry.slice(0, 2).map((i) => (
              <span
                key={i}
                className="px-2 py-0.5 border border-line rounded-full min-w-0 truncate"
              >
                {i}
              </span>
            ))}
            {profile.industry.length > 2 && (
              <span className="shrink-0">+{profile.industry.length - 2}</span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
