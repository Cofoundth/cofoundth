"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import { updateProfileAction } from "./actions";
import { useT, useLocale } from "@/lib/i18n-client";
import { provinceOptions, provinceLabel, canonicalProvince } from "@/lib/provinces";
import Combobox from "@/components/Combobox";
import { ProjectImagesField } from "@/components/ProjectImagesField";
import { INDUSTRIES } from "@/lib/industries";
import { COMMON_SKILLS } from "@/lib/skills";
import { ACTIVITIES } from "@/lib/activities";
import { HELP_TOPICS } from "@/lib/help-topics";
import { LONG_TEXT_MAX } from "@/lib/limits";
import { SectionHeading, ToggleChip } from "@/components/ui";
import { SETTINGS_HEADING, SETTINGS_SECTION } from "./settings-layout";
import { SettingsSaveActions, type EditOutcome } from "./SettingsSaveActions";

const ROLES = [
  { value: "technical", label: "Technical" },
  { value: "business", label: "Business" },
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
  { value: "legal", label: "Legal" },
];
const INTENTS = [
  { value: "idea", label: "I have an idea" },
  { value: "open", label: "I have skills" },
  { value: "explore", label: "Let's explore" },
];
const STAGES = [
  { value: "exploring", label: "Just exploring" },
  { value: "building", label: "Building MVP" },
  { value: "traction", label: "Have traction" },
  { value: "raising", label: "Raising" },
];
const COMMITMENTS = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "side_project", label: "Side project" },
];
const RUNWAYS = [
  { value: "three_months", label: "3 months" },
  { value: "six_months", label: "6 months" },
  { value: "twelve_months", label: "12 months" },
  { value: "eighteen_plus", label: "18+ months" },
];
const EXPERIENCES = [
  { value: "first_time", label: "First-time founder" },
  { value: "one_to_two", label: "1–2 ventures" },
  { value: "three_plus", label: "3+ ventures" },
];
// Time in the CURRENT venture — a different question from EXPERIENCES, which
// counts how many ventures there have been.
const BUILDING_SINCE = [
  { value: "under_six_months", label: "Under 6 months" },
  { value: "six_to_twelve_months", label: "6–12 months" },
  { value: "one_to_two_years", label: "1–2 years" },
  { value: "two_to_five_years", label: "2–5 years" },
  { value: "over_five_years", label: "5+ years" },
];
const STATUS_TAGS = [
  { value: "open_to_cofounder", label: "Open to co-founder" },
  { value: "open_to_partnerships", label: "Open to partnerships" },
  { value: "hiring", label: "Hiring" },
  { value: "raising", label: "Raising" },
  { value: "looking_for_advisors", label: "Looking for advisors" },
];

export type ProfileInitial = {
  onboarded?: boolean;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  age?: number | null;
  location?: string | null;
  linkedin_url?: string | null;
  instagram_url?: string | null;
  facebook_url?: string | null;
  x_url?: string | null;
  type?: string | null;
  company_name?: string | null;
  capabilities?: string[] | null;
  partnership_seeking?: string[] | null;
  status_tags?: string[] | null;
  i_am?: string[] | null;
  intent?: string[] | null;
  looking_for?: string[] | null;
  industry?: string[] | null;
  stage?: string | null;
  commitment?: string | null;
  runway?: string | null;
  experience?: string | null;
  pitch?: string | null;
  project_url?: string | null;
  project_images?: string[] | null;
  why_this?: string | null;
  background?: string | null;
  work_experience?: string | null;
  education?: string | null;
  skills?: string[] | null;
  activities?: string[] | null;
  help_with?: string[] | null;
  needs_help_with?: string[] | null;
  building_since?: string | null;
};

export function EditProfileForm({ initial }: { initial: ProfileInitial }) {
  const [editor, setEditor] = useState({
    saved: initial,
    revision: 0,
    outcome: null as EditOutcome | null,
  });

  return (
    <ProfileDraft
      key={editor.revision}
      initial={editor.saved}
      outcome={editor.outcome}
      onSaved={(saved) => setEditor((previous) => ({
        saved, revision: previous.revision + 1, outcome: "saved",
      }))}
      onDiscard={() => setEditor((previous) => ({
        ...previous, revision: previous.revision + 1, outcome: "discarded",
      }))}
    />
  );
}

function ProfileDraft({
  initial, outcome, onSaved, onDiscard,
}: {
  initial: ProfileInitial;
  outcome: EditOutcome | null;
  onSaved: (saved: ProfileInitial) => void;
  onDiscard: () => void;
}) {
  const tr = useT();
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const savedFields = useRef<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const needsOnboardingSave = initial.onboarded === false;

  function measureChanges() {
    if (formRef.current && !isPending) {
      setDirty(JSON.stringify([...new FormData(formRef.current)]) !== savedFields.current);
    }
  }

  // Hidden inputs update when a chip is selected or an image finishes
  // uploading. Read those values after React commits them to the form.
  useLayoutEffect(() => {
    if (!formRef.current || isPending) return;
    savedFields.current ??= JSON.stringify([...new FormData(formRef.current)]);
    const frame = requestAnimationFrame(measureChanges);
    return () => cancelAnimationFrame(frame);
  });

  function handleSave() {
    if (!formRef.current || isPending || uploading) return;
    const fd = new FormData(formRef.current);
    if (!needsOnboardingSave && JSON.stringify([...fd]) === savedFields.current) return;
    setError(null);
    startTransition(async () => {
      const result = await updateProfileAction(fd).catch(() => ({
        error: "Couldn’t save your changes. Try again.",
      }));
      if ("profile" in result) onSaved(result.profile);
      else setError(result.error);
    });
  }

  const [iAm, setIAm] = useState<string[]>(initial.i_am ?? []);
  const [intent, setIntent] = useState<string[]>(initial.intent ?? []);
  const [lookingFor, setLookingFor] = useState<string[]>(
    initial.looking_for ?? [],
  );
  const [industry, setIndustry] = useState<string[]>(initial.industry ?? []);
  const [stage, setStage] = useState(initial.stage ?? "");
  const [commitment, setCommitment] = useState(initial.commitment ?? "");
  const [runway, setRunway] = useState(initial.runway ?? "");
  const [experience, setExperience] = useState(initial.experience ?? "");
  const [statusTags, setStatusTags] = useState<string[]>(
    initial.status_tags ?? [],
  );
  const [pitch, setPitch] = useState(initial.pitch ?? "");
  const [projectImages, setProjectImages] = useState<string[]>(
    initial.project_images ?? [],
  );
  const [skills, setSkills] = useState<string[]>(initial.skills ?? []);
  const [activities, setActivities] = useState<string[]>(
    initial.activities ?? [],
  );
  const [helpWith, setHelpWith] = useState<string[]>(initial.help_with ?? []);
  const [needsHelp, setNeedsHelp] = useState<string[]>(
    initial.needs_help_with ?? [],
  );
  const [buildingSince, setBuildingSince] = useState(
    initial.building_since ?? "",
  );

  // Combobox matches on the visible string, so a Thai reader has to see Thai in
  // the menu. Options are the TRANSLATED labels and this maps the pick back to
  // the canonical English value, which is what the column stores and what every
  // filter compares against.
  const activityByLabel = useMemo(
    () => new Map(ACTIVITIES.map((a) => [tr(a), a])),
    [tr],
  );
  const helpByLabel = useMemo(
    () => new Map(HELP_TOPICS.map((h) => [tr(h), h])),
    [tr],
  );
  const [location, setLocation] = useState(initial.location ?? "");
  const [firstName, setFirstName] = useState(initial.first_name ?? "");
  const [lastName, setLastName] = useState(initial.last_name ?? "");

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  // The four fields that gate directory visibility (migration 0046's
  // profile_complete trigger). Flagged red until filled, and on load we land the
  // user on the first empty one — so it's obvious what's blocking the listing.
  const nameMissing = !firstName.trim() && !lastName.trim();
  const roleMissing = iAm.length === 0;
  const lookingMissing = lookingFor.length === 0;
  const pitchMissing = !pitch.trim();

  useEffect(() => {
    if (outcome) return;
    const firstId = [
      nameMissing && "rf-name",
      roleMissing && "rf-role",
      lookingMissing && "rf-looking",
      pitchMissing && "rf-pitch",
    ].find(Boolean) as string | undefined;
    if (firstId)
      document
        .getElementById(firstId)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <form
      ref={formRef}
      onInput={measureChanges}
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-10"
    >
      <fieldset disabled={isPending} className="min-w-0 space-y-10">
      {/* Personal */}
      <Section title={tr("Personal information")}>
        <div id="rf-name" className="grid grid-cols-2 gap-4">
          <Field htmlFor="settings-first_name" label={tr("First name")}>
            <input
              id="settings-first_name"
              name="first_name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              maxLength={40}
              className={reqInput(nameMissing)}
            />
          </Field>
          <Field htmlFor="settings-last_name" label={tr("Last name")}>
            <input
              id="settings-last_name"
              name="last_name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              maxLength={40}
              className={reqInput(nameMissing)}
            />
          </Field>
        </div>
        {nameMissing && <RequiredFlag tr={tr} />}
        <div className="grid grid-cols-2 gap-4">
          <Field htmlFor="settings-age" label={tr("Age (optional)")}>
            <input
              id="settings-age"
              name="age"
              type="number"
              min={16}
              max={100}
              defaultValue={initial.age ?? ""}
              className={inputCls}
            />
          </Field>
          <Field htmlFor="settings-location" label={tr("Location (optional)")}>
            <Combobox
              id="settings-location"
              name="location"
              options={provinceOptions(locale)}
              value={provinceLabel(location, locale)}
              onChange={(v) => setLocation(canonicalProvince(v))}
              placeholder="Bangkok, Remote, etc."
              className={inputCls}
            />
          </Field>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field htmlFor="settings-linkedin_url" label={tr("LinkedIn (optional)")}>
            <input
              id="settings-linkedin_url"
              name="linkedin_url"
              defaultValue={initial.linkedin_url ?? ""}
              placeholder="linkedin.com/in/you"
              className={inputCls}
            />
          </Field>
          <Field htmlFor="settings-x_url" label={tr("X (optional)")}>
            <input
              id="settings-x_url"
              name="x_url"
              defaultValue={initial.x_url ?? ""}
              placeholder="x.com/you"
              className={inputCls}
            />
          </Field>
          <Field htmlFor="settings-instagram_url" label={tr("Instagram (optional)")}>
            <input
              id="settings-instagram_url"
              name="instagram_url"
              defaultValue={initial.instagram_url ?? ""}
              placeholder="instagram.com/you"
              className={inputCls}
            />
          </Field>
          <Field htmlFor="settings-facebook_url" label={tr("Facebook (optional)")}>
            <input
              id="settings-facebook_url"
              name="facebook_url"
              defaultValue={initial.facebook_url ?? ""}
              placeholder="facebook.com/you"
              className={inputCls}
            />
          </Field>
        </div>
        <Field htmlFor="settings-work_experience" label={tr("Work experience (optional)")}>
          <textarea
            id="settings-work_experience"
            name="work_experience"
            defaultValue={initial.work_experience ?? ""}
            rows={4}
            maxLength={LONG_TEXT_MAX}
            className={inputCls}
            placeholder={tr(
              "Roles, companies, what you built. One per line is fine.",
            )}
          />
        </Field>
        <Field htmlFor="settings-education" label={tr("Education (optional)")}>
          <textarea
            id="settings-education"
            name="education"
            defaultValue={initial.education ?? ""}
            rows={2}
            maxLength={LONG_TEXT_MAX}
            className={inputCls}
            placeholder={tr("Degrees, schools, bootcamps.")}
          />
        </Field>
      </Section>

      {/* Identity */}
      <Section title={tr("Identity")}>
        {/* B2B company profile type parked until Phase 3 — everyone is an
            individual for now. Keep the hidden input so the action still gets a
            valid profile_type. Re-enable the toggle + company-name field to bring
            company profiles back.
        <Label>{tr("Joining as…")}</Label>
        <div className="flex gap-3">
          <Chip on={type === "individual"} onClick={() => setType("individual")}>
            {tr("Individual")}
          </Chip>
          <Chip on={type === "company"} onClick={() => setType("company")}>
            {tr("Company")}
          </Chip>
        </div>
        {type === "company" && (
          <Field htmlFor="settings-company_name" label={tr("Company name")}>
            <input
              id="settings-company_name"
              name="company_name"
              defaultValue={initial.company_name ?? ""}
              maxLength={100}
              className={inputCls}
            />
          </Field>
        )}
        */}
        <input type="hidden" name="profile_type" value="individual" />

        <Label id="rf-role" missing={roleMissing}>
          {tr("I am…")}
        </Label>
        <Pills
          options={ROLES}
          selected={iAm}
          onPick={(v) => setIAm((s) => toggle(s, v))}
          tr={tr}
        />
        {iAm.map((v) => (
          <input key={v} type="hidden" name="i_am" value={v} />
        ))}
        {roleMissing && <RequiredFlag tr={tr} />}

        <Label>{tr("I'm bringing…")}</Label>
        <Pills
          options={INTENTS}
          selected={intent}
          onPick={(v) => setIntent((s) => toggle(s, v))}
          tr={tr}
        />
        {intent.map((v) => (
          <input key={v} type="hidden" name="intent" value={v} />
        ))}

        <Label id="rf-looking" missing={lookingMissing}>
          {tr("I'm looking for…")}
        </Label>
        <Pills
          options={ROLES}
          selected={lookingFor}
          onPick={(v) => setLookingFor((s) => toggle(s, v))}
          tr={tr}
        />
        {lookingFor.map((v) => (
          <input key={v} type="hidden" name="looking_for" value={v} />
        ))}
        {lookingMissing && <RequiredFlag tr={tr} />}
      </Section>

      {/* Context */}
      <Section title={tr("Context")}>
        <Label>{tr("Industry focus")}</Label>
        <Pills
          options={INDUSTRIES.map((i) => ({ value: i, label: i }))}
          selected={industry}
          onPick={(v) => setIndustry((s) => toggle(s, v))}
          tr={tr}
        />
        {industry.map((v) => (
          <input key={v} type="hidden" name="industry" value={v} />
        ))}
        <div className="flex flex-wrap gap-2 mt-2">
          {industry
            .filter((i) => !INDUSTRIES.includes(i))
            .map((i) => (
              <Chip
                key={i}
                on
                onClick={() => setIndustry((s) => s.filter((x) => x !== i))}
              >
                {i} ✕
              </Chip>
            ))}
        </div>
        <input
          type="text"
          aria-label={tr("Other industry")}
          placeholder={tr("Other — type and press Enter")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = e.currentTarget.value.trim();
              if (v) setIndustry((s) => (s.includes(v) ? s : [...s, v]));
              e.currentTarget.value = "";
            }
          }}
          className="mt-2 w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-navy rounded-xl"
        />

        <Label>{tr("Your stage")}</Label>
        <Pills options={STAGES} selected={[stage]} onPick={setStage} tr={tr} />
        <input type="hidden" name="stage" value={stage} />
      </Section>

      {/* Conviction */}
      <Section title={tr("Conviction")}>
        <Label>{tr("Commitment level")}</Label>
        <Pills
          options={COMMITMENTS}
          selected={[commitment]}
          onPick={setCommitment}
          tr={tr}
        />
        <input type="hidden" name="commitment" value={commitment} />

        <Label>{tr("Financial runway (optional)")}</Label>
        <Pills options={RUNWAYS} selected={[runway]} onPick={setRunway} tr={tr} />
        <input type="hidden" name="runway" value={runway} />

        <Label>{tr("How long have you been building this?")}</Label>
        <Pills
          options={BUILDING_SINCE}
          selected={[buildingSince]}
          onPick={setBuildingSince}
          tr={tr}
        />
        <input type="hidden" name="building_since" value={buildingSince} />

        <Label>{tr("Founder experience")}</Label>
        <Pills
          options={EXPERIENCES}
          selected={[experience]}
          onPick={setExperience}
          tr={tr}
        />
        <input type="hidden" name="experience" value={experience} />
      </Section>

      {/* Signals */}
      <Section title={tr("Right now I'm…")}>
        <Pills
          options={STATUS_TAGS}
          selected={statusTags}
          onPick={(v) => setStatusTags((s) => toggle(s, v))}
          tr={tr}
        />
        {statusTags.map((v) => (
          <input key={v} type="hidden" name="status_tags" value={v} />
        ))}
      </Section>

      {/* What are you building */}
      <Section title={tr("Info & ideas")}>
        <div id="rf-pitch">
          <Field
            htmlFor="settings-pitch"
            label={`${tr("Introduce yourself — or if you’ve got an idea, pitch it to attract other founders")} (${pitch.trim().length}/${LONG_TEXT_MAX})`}
          >
            <textarea
              id="settings-pitch"
              name="pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              rows={5}
              maxLength={LONG_TEXT_MAX}
              placeholder={tr(
                "e.g. I’m a programmer, 5 years in tech, built an online shopping app. Got a cool idea? Pitch it — I’d love to hear it.",
              )}
              className={reqInput(pitchMissing)}
            />
          </Field>
          {pitchMissing && <RequiredFlag tr={tr} />}
        </div>
        <Field htmlFor="settings-project_url" label={tr("Link to your project (optional)")}>
          <input
            id="settings-project_url"
            name="project_url"
            defaultValue={initial.project_url ?? ""}
            placeholder="https://"
            className={inputCls}
          />
        </Field>
        <Field label={tr("Add images (optional)")}>
          <ProjectImagesField
            value={projectImages}
            onChange={setProjectImages}
            onUploadChange={setUploading}
          />
        </Field>
        <Field htmlFor="settings-why_this" label={tr("Why this, why now (optional)")}>
          <textarea
            id="settings-why_this"
            name="why_this"
            defaultValue={initial.why_this ?? ""}
            rows={3}
            maxLength={LONG_TEXT_MAX}
            className={inputCls}
            placeholder={tr(
              "e.g. I ran into this problem myself, and now's finally the right time to fix it.",
            )}
          />
        </Field>
        <Field htmlFor="settings-background" label={tr("Background (optional)")}>
          <textarea
            id="settings-background"
            name="background"
            defaultValue={initial.background ?? ""}
            rows={4}
            maxLength={LONG_TEXT_MAX}
            className={inputCls}
            placeholder={tr(
              "e.g. Ex-engineer at Agoda, built and sold a logistics SaaS, CS at Chula.",
            )}
          />
        </Field>
        <Field htmlFor="settings-skills" label={tr("Skills (type and press Enter)")}>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {skills.map((sk) => (
                <Chip
                  key={sk}
                  on
                  onClick={() => setSkills((s) => s.filter((x) => x !== sk))}
                >
                  {sk} ✕
                </Chip>
              ))}
            </div>
          )}
          <Combobox
            id="settings-skills"
            options={COMMON_SKILLS}
            value=""
            onChange={(v) => {
              const skill = v.trim();
              if (skill)
                setSkills((s) => (s.includes(skill) ? s : [...s, skill]));
            }}
            placeholder="React, Sales, Fundraising…"
            allowCustom
            className={inputCls}
            emptyText={tr("Type to add")}
          />
          {skills.map((s) => (
            <input key={s} type="hidden" name="skills" value={s} />
          ))}
        </Field>

        {/* Outcomes, not hard skills — see lib/help-topics.ts. The label has to
            carry the "I can help with…" frame or the chips read ambiguously. */}
        <Field htmlFor="settings-help_with" label={tr("I can help with")}>
          {helpWith.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {helpWith.map((h) => (
                <Chip
                  key={h}
                  on
                  onClick={() => setHelpWith((s) => s.filter((x) => x !== h))}
                >
                  {tr(h)} ✕
                </Chip>
              ))}
            </div>
          )}
          <Combobox
            id="settings-help_with"
            options={HELP_TOPICS.filter((h) => !helpWith.includes(h)).map((h) =>
              tr(h),
            )}
            value=""
            onChange={(v) => {
              const canonical = helpByLabel.get(v.trim());
              if (canonical)
                setHelpWith((s) =>
                  s.includes(canonical) ? s : [...s, canonical],
                );
            }}
            placeholder={tr("Search help topics")}
            allowCustom={false}
            className={inputCls}
            emptyText={tr("No matches")}
          />
          {helpWith.map((h) => (
            <input key={h} type="hidden" name="help_with" value={h} />
          ))}
        </Field>

        {/* The demand side of the same vocabulary. Storing only what someone can
            offer left nothing to match it against. */}
        <Field htmlFor="settings-needs_help_with" label={tr("What do you need help with?")}>
          {needsHelp.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {needsHelp.map((h) => (
                <Chip
                  key={h}
                  on
                  onClick={() => setNeedsHelp((s) => s.filter((x) => x !== h))}
                >
                  {tr(h)} ✕
                </Chip>
              ))}
            </div>
          )}
          <Combobox
            id="settings-needs_help_with"
            options={HELP_TOPICS.filter((h) => !needsHelp.includes(h)).map((h) =>
              tr(h),
            )}
            value=""
            onChange={(v) => {
              const canonical = helpByLabel.get(v.trim());
              if (canonical)
                setNeedsHelp((s) =>
                  s.includes(canonical) ? s : [...s, canonical],
                );
            }}
            placeholder={tr("Search help topics")}
            allowCustom={false}
            className={inputCls}
            emptyText={tr("No matches")}
          />
          {needsHelp.map((h) => (
            <input key={h} type="hidden" name="needs_help_with" value={h} />
          ))}
        </Field>

        {/* Feeds meetups: what this member would actually DO with someone. */}
        <Field htmlFor="settings-activities" label={tr("What do you do for fun?")}>
          {activities.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {activities.map((a) => (
                <Chip
                  key={a}
                  on
                  onClick={() => setActivities((s) => s.filter((x) => x !== a))}
                >
                  {tr(a)} ✕
                </Chip>
              ))}
            </div>
          )}
          <Combobox
            id="settings-activities"
            options={ACTIVITIES.filter((a) => !activities.includes(a)).map((a) =>
              tr(a),
            )}
            value=""
            onChange={(v) => {
              const canonical = activityByLabel.get(v.trim());
              if (canonical)
                setActivities((s) =>
                  s.includes(canonical) ? s : [...s, canonical],
                );
            }}
            placeholder={tr("Search activities")}
            allowCustom={false}
            className={inputCls}
            emptyText={tr("No matches")}
          />
          {activities.map((a) => (
            <input key={a} type="hidden" name="activities" value={a} />
          ))}
        </Field>
      </Section>
      </fieldset>

      {/* Save bar */}
      <div className="sticky bottom-0 z-10 -mx-6 border-t border-line bg-cream/95 px-6 py-3 backdrop-blur lg:-mx-10 lg:px-10">
        <SettingsSaveActions
          dirty={dirty}
          canSave={dirty || needsOnboardingSave}
          saving={isPending}
          uploading={uploading}
          outcome={outcome}
          error={error}
          onDiscard={onDiscard}
        />
      </div>
    </form>
  );
}

// ---- presentational helpers ----------------------------------------

const inputCls =
  "w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none";

// Required-field input: red border + tint until filled.
const reqInput = (missing: boolean) =>
  `w-full border bg-white px-3 py-2 text-sm text-ink focus:outline-none ${
    missing
      ? "border-danger-line bg-danger-surface focus:border-danger-ink"
      : "border-line focus:border-navy"
  }`;

function RequiredFlag({ tr }: { tr: (s: string) => string }) {
  return (
    <p className="text-xs text-danger-ink mt-1.5">
      {tr("Required to appear in the Founders directory")}
    </p>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    // A row from `lg`: title left, fields right (./settings-layout.ts).
    <section className={`space-y-4 lg:space-y-0 ${SETTINGS_SECTION}`}>
      {/* SETTINGS_HEADING and no mb-*: the primitive's default mb-5 stays OFF,
          because the wrapper spaces its children with space-y-4. */}
      <SectionHeading title={title} divider className={SETTINGS_HEADING} />
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

function Field({
  htmlFor,
  label,
  children,
}: {
  htmlFor?: string;
  label: string;
  children: React.ReactNode;
}) {
  const Caption = htmlFor ? "label" : "p";
  return (
    <div className="space-y-1.5">
      <Caption htmlFor={htmlFor} className="block text-sm text-ink-muted">
        {label}
      </Caption>
      {children}
    </div>
  );
}

function Label({
  children,
  missing,
  id,
}: {
  children: React.ReactNode;
  missing?: boolean;
  id?: string;
}) {
  return (
    <p
      id={id}
      className={`text-sm ${missing ? "text-danger-ink font-medium" : "text-ink-muted"}`}
    >
      {children}
    </p>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  // tracking={false}: these never carried tracking-wide, and the primitive
  // adds it by default.
  return (
    <ToggleChip selected={on} size="md" tracking={false} onClick={onClick}>
      {children}
    </ToggleChip>
  );
}

function Pills({
  options,
  selected,
  onPick,
  tr,
}: {
  options: { value: string; label: string }[];
  selected: string[];
  onPick: (v: string) => void;
  tr: (s: string) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip
          key={o.value}
          on={selected.includes(o.value)}
          onClick={() => onPick(o.value)}
        >
          {tr(o.label)}
        </Chip>
      ))}
    </div>
  );
}
