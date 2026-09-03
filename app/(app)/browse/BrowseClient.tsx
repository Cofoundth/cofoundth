"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  BadgeCheck,
  Building2,
  ChevronDown,
  HeartHandshake,
  MapPin,
  Rocket,
  Search,
  SlidersHorizontal,
  Users,
} from "lucide-react";
import {
  type ProfileLike,
  ROLE_LABELS,
  STAGE_LABELS,
  COMMITMENT_LABELS,
  INTENT_LABELS,
} from "@/lib/matching";
import { Avatar } from "@/components/Avatar";
import {
  Button,
  Card,
  CardChip,
  CardLabel,
  CardPill,
  EmptyState,
  LinkButton,
  Section,
  StageEmblem,
} from "@/components/ui";
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
  const roles = (profile.i_am ?? []).map((r) => tr(ROLE_LABELS[r])).filter(Boolean);
  const intents = (profile.intent ?? [])
    .map((i) => (INTENT_LABELS[i] ? tr(INTENT_LABELS[i]) : null))
    .filter(Boolean) as string[];
  const helpWith = profile.help_with ?? [];
  // Idea-havers sell the project; explorers sell their track record.
  const hasIdea = (profile.intent ?? []).includes("idea");
  const title =
    isCompany && profile.company_name ? profile.company_name : profile.full_name;
  const blurb = hasIdea
    ? profile.pitch
    : profile.work_experience || profile.background || profile.pitch;

  return (
    // min-w-0: a grid item defaults to min-width:auto and will not shrink
    // below its content's min-content width. Without it the long joined
    // industry run pushed the card to 1157px inside a 342px track on a
    // phone, and truncate INSIDE the card cannot fix an unconstrained card.
    <Link
      href={`/profile/${profile.slug}`}
      className="group block h-full min-w-0"
    >
      <Card
        hoverable
        padding="xs"
        className="h-full flex flex-col"
      >
        {/* HEADER — 48px, avatar beside a name/meta column. Nothing below it
            is indented past the avatar; every row starts at the padding edge. */}
        <div className="shrink-0 flex gap-3 items-center">
          <Avatar name={profile.full_name} url={profile.photo_url} size="md" />
          <div className="flex flex-col justify-center min-w-0 flex-1 overflow-hidden">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold leading-none group-hover:text-gold-ink transition-colors">
              <span className="truncate">{title}</span>
              {profile.verified && (
                <BadgeCheck className="w-4 h-4 text-gold-ink shrink-0" strokeWidth={2} />
              )}
              {isCompany && (
                <Building2 className="w-3.5 h-3.5 text-gold-ink shrink-0" strokeWidth={2} />
              )}
            </h3>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-ink-muted overflow-hidden">
              {profile.location && (
                <span className="inline-flex min-w-0 items-center gap-1">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {provinceLabel(profile.location, locale)}
                  </span>
                </span>
              )}
              {isNew && <span className="shrink-0 text-gold-ink">{tr("New")}</span>}
            </div>
          </div>
          {/* Stage as a corner glyph, matching /founders and Onfound. Intent
              stays inline below — they are different axes: stage is how far
              along the company is, intent is what the person is bringing. */}
          <StageEmblem
            stage={profile.stage}
            label={
              profile.stage && STAGE_LABELS[profile.stage]
                ? tr(STAGE_LABELS[profile.stage])
                : ""
            }
          />
        </div>

        {/* BODY — three rows on a 10px rhythm, each full card width. */}
        <div className="mt-4 flex flex-col gap-4 flex-1 min-h-0">
          {/* Row A: what they are here for, then the sector. Their card pairs a
              pill with plain muted text on one line — the text form fits two or
              three industries where a second chip fit none. */}
          {/* Always rendered at a reserved height, so a profile missing an
              intent or a sector does not pull the rows below it upward. */}
          <div className="flex h-[21px] items-center gap-2 overflow-hidden">
            {intents.length > 0 && <CardPill>{intents[0]}</CardPill>}
            <span className="min-w-0 truncate text-xs text-ink-muted">
              {[...roles, ...profile.industry].join(" · ")}
            </span>
          </div>

          {blurb && (
            <div className="flex flex-col gap-1.5 min-w-0">
              <CardLabel icon={Rocket}>{tr("Working on")}</CardLabel>
              <p className="text-xs leading-relaxed line-clamp-2 text-ink-muted min-h-[39px]">
                {blurb}
              </p>
            </div>
          )}

          {/* Row C: the reason to open a stranger's profile. This is the field
              the card was missing entirely — we store it and never showed it. */}
          {!isCompany && helpWith.length > 0 && (
            <div className="flex flex-col gap-1.5 min-w-0">
              <CardLabel icon={HeartHandshake}>{tr("Can help with")}</CardLabel>
              <div className="flex flex-row gap-1.5 overflow-hidden h-[22px]">
                {helpWith.slice(0, 3).map((h) => (
                  <CardChip key={h}>{tr(h)}</CardChip>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* FOOTER — what they want back, pinned so every card ends level. */}
        {!isCompany && (profile.looking_for ?? []).length > 0 && (
          <div className="mt-auto pt-3 flex items-center gap-1.5 overflow-hidden text-xs text-ink-muted">
            <Search className="w-3 h-3 shrink-0" strokeWidth={2} />
            <span className="min-w-0 truncate">
              {(profile.looking_for ?? [])
                .map((r) => tr(ROLE_LABELS[r]))
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        )}
      </Card>
    </Link>
  );
}
