"use client";

import { useRef, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateProfileAction } from "./actions";
import { useT } from "@/lib/i18n-client";
import { THAI_PROVINCES } from "@/lib/provinces";

type SaveResult = { error?: string; ok?: boolean } | null;

const ROLES = [
  { value: "technical", label: "Technical" },
  { value: "business", label: "Business" },
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
  { value: "domain_expert", label: "Domain Expert" },
];
const INTENTS = [
  { value: "idea", label: "I have an idea" },
  { value: "open", label: "I have skills" },
  { value: "explore", label: "Let's explore" },
];
const INDUSTRIES = [
  "FinTech", "HealthTech", "E-commerce", "SaaS", "AI / ML", "PropTech",
  "Consumer", "EdTech", "Logistics", "Sustainability", "Media / Content",
  "Travel", "Food & Beverage",
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
const STATUS_TAGS = [
  { value: "open_to_cofounder", label: "Open to co-founder" },
  { value: "open_to_partnerships", label: "Open to partnerships" },
  { value: "hiring", label: "Hiring" },
  { value: "raising", label: "Raising" },
  { value: "looking_for_advisors", label: "Looking for advisors" },
];

export type ProfileInitial = {
  full_name?: string | null;
  age?: number | null;
  location?: string | null;
  linkedin_url?: string | null;
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
  why_this?: string | null;
  skills?: string[] | null;
};

export function EditProfileForm({ initial }: { initial: ProfileInitial }) {
  const tr = useT();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, setState] = useState<SaveResult>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    startTransition(async () => {
      setState(await updateProfileAction(null, fd));
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

  const toggle = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  return (
    <form
      ref={formRef}
      onSubmit={(e) => {
        e.preventDefault();
        handleSave();
      }}
      className="space-y-10"
    >
      {/* Personal */}
      <Section title={tr("Personal information")}>
        <Field label={tr("Full name")}>
          <input
            name="full_name"
            defaultValue={initial.full_name ?? ""}
            required
            maxLength={80}
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label={tr("Age (optional)")}>
            <input
              name="age"
              type="number"
              min={16}
              max={100}
              defaultValue={initial.age ?? ""}
              className={inputCls}
            />
          </Field>
          <Field label={tr("Location (optional)")}>
            <input
              name="location"
              list="thai-provinces"
              defaultValue={initial.location ?? ""}
              placeholder="Bangkok, Remote, etc."
              className={inputCls}
            />
            <datalist id="thai-provinces">
              {THAI_PROVINCES.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </Field>
        </div>
        <Field label={tr("LinkedIn (optional)")}>
          <input
            name="linkedin_url"
            defaultValue={initial.linkedin_url ?? ""}
            placeholder="linkedin.com/in/you"
            className={inputCls}
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
          <Field label={tr("Company name")}>
            <input
              name="company_name"
              defaultValue={initial.company_name ?? ""}
              maxLength={100}
              className={inputCls}
            />
          </Field>
        )}
        */}
        <input type="hidden" name="profile_type" value="individual" />

        <Label>{tr("I am…")}</Label>
        <Pills
          options={ROLES}
          selected={iAm}
          onPick={(v) => setIAm((s) => toggle(s, v))}
          tr={tr}
        />
        {iAm.map((v) => (
          <input key={v} type="hidden" name="i_am" value={v} />
        ))}

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

        <Label>{tr("I'm looking for…")}</Label>
        <Pills
          options={ROLES}
          selected={lookingFor}
          onPick={(v) => setLookingFor((s) => toggle(s, v))}
          tr={tr}
        />
        {lookingFor.map((v) => (
          <input key={v} type="hidden" name="looking_for" value={v} />
        ))}
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

      {/* Pitch */}
      <Section title={tr("The pitch")}>
        <Field
          label={`${tr("The pitch")} (${pitch.trim().length}/500)`}
        >
          <textarea
            name="pitch"
            value={pitch}
            onChange={(e) => setPitch(e.target.value)}
            rows={5}
            maxLength={500}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Why this, why now (optional)")}>
          <textarea
            name="why_this"
            defaultValue={initial.why_this ?? ""}
            rows={3}
            maxLength={1000}
            className={inputCls}
          />
        </Field>
        <Field label={tr("Skills (comma-separated, optional)")}>
          <input
            name="skills"
            defaultValue={(initial.skills ?? []).join(", ")}
            placeholder="React, B2B Sales, Fundraising"
            className={inputCls}
          />
        </Field>
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-6 lg:-mx-10 px-6 lg:px-10 py-4 bg-cream/95 backdrop-blur border-t border-line flex items-center gap-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-navy text-white text-sm tracking-wide hover:bg-navy/90 disabled:opacity-60 transition-colors"
        >
          {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          {tr("Save changes")}
        </button>
        {state?.ok && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-700">
            <Check className="w-4 h-4" /> {tr("Saved")}
          </span>
        )}
        {state?.error && (
          <span className="text-sm text-red-700">{state.error}</span>
        )}
      </div>
    </form>
  );
}

// ---- presentational helpers ----------------------------------------

const inputCls =
  "w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:border-navy focus:outline-none";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <h2 className="text-xs uppercase tracking-[0.2em] text-gold border-b border-line pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-ink-muted">{children}</p>;
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 text-sm border transition-colors ${
        on
          ? "border-navy bg-navy text-white"
          : "border-line bg-white text-ink hover:border-navy"
      }`}
    >
      {children}
    </button>
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
