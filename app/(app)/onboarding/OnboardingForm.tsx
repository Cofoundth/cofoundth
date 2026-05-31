"use client";

import { Fragment, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { saveOnboardingAction } from "./actions";
import { useT } from "@/lib/i18n-client";
import { THAI_PROVINCES } from "@/lib/provinces";
import { INDUSTRIES } from "@/lib/industries";

// ---- Option lists ---------------------------------------------------

const ROLES = [
  { value: "technical", label: "Technical" },
  { value: "business", label: "Business" },
  { value: "product", label: "Product" },
  { value: "marketing", label: "Marketing" },
  { value: "finance", label: "Finance" },
  { value: "domain_expert", label: "Domain Expert" },
];

const INTENTS = [
  {
    value: "idea",
    label: "I have an idea",
    description: "I have a clear vision and need someone to execute it with me.",
  },
  {
    value: "open",
    label: "I have skills",
    description: "I can build, sell, or design — open to joining a strong vision.",
  },
  {
    value: "explore",
    label: "Let's explore",
    description: "I want to brainstorm and find the right opportunity with a partner.",
  },
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

// Tappable pitch scaffolds — beat blank-page paralysis (the #1 onboarding
// abandonment driver). Each fills the textarea with a fill-in-the-blank
// starter the founder edits. `template` strings are i18n keys.
const PITCH_STARTERS = [
  {
    en: "I have an idea",
    template:
      "I'm building [what] for [who]. The problem is [problem]. I've already [traction so far], and I'm looking for a co-founder who can [what they bring].",
  },
  {
    en: "I have skills",
    template:
      "I'm a [your role] with [N] years in [domain]. I've built [notable work]. I want to join a founder with a strong vision in [industry] and own [what you'd own].",
  },
  {
    en: "Still exploring",
    template:
      "My background is [background]. I'm drawn to problems in [areas]. I'm looking for someone to explore ideas with and figure out what to build together.",
  },
];

// ---- Types ----------------------------------------------------------

type StatusTag =
  | "open_to_partnerships"
  | "open_to_cofounder"
  | "hiring"
  | "raising"
  | "looking_for_advisors";

type FormState = {
  full_name: string;
  profile_type: "individual" | "company";
  company_name: string;
  capabilities: string;
  partnership_seeking: string;
  status_tags: StatusTag[];
  i_am: string[];
  intent: string[];
  looking_for: string[];
  industry: string[];
  stage: string;
  location: string;
  commitment: string;
  runway: string;
  experience: string;
  pitch: string;
  why_this: string;
  background: string;
  skills: string;
};

type Props = {
  initial: Partial<FormState>;
};

const STEPS = [
  { num: "I", title: "Role" },
  { num: "II", title: "Context" },
  { num: "III", title: "Conviction" },
  { num: "IV", title: "Pitch" },
];

// ---- Component ------------------------------------------------------

export function OnboardingForm({ initial }: Props) {
  const tr = useT();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<FormState>({
    full_name: "",
    profile_type: "individual",
    company_name: "",
    capabilities: "",
    partnership_seeking: "",
    status_tags: [],
    i_am: [],
    intent: [],
    looking_for: [],
    industry: [],
    stage: "",
    location: "",
    commitment: "",
    runway: "",
    experience: "",
    pitch: "",
    why_this: "",
    background: "",
    skills: "",
    ...initial,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggle(
    key: "looking_for" | "industry" | "i_am" | "intent",
    value: string,
  ) {
    setData((d) => {
      const list = d[key];
      return {
        ...d,
        [key]: list.includes(value)
          ? list.filter((v) => v !== value)
          : [...list, value],
      };
    });
  }

  function stepValid(): boolean {
    switch (step) {
      case 0:
        if (data.full_name.trim().length < 2) return false;
        if (data.profile_type === "company" && !data.company_name.trim())
          return false;
        return (
          data.i_am.length > 0 &&
          data.intent.length > 0 &&
          data.looking_for.length > 0
        );
      case 1:
        return data.industry.length > 0 && !!data.stage;
      case 2:
        // runway is optional — invasive to force before any trust is built
        return !!data.commitment && !!data.experience;
      case 3:
        return data.pitch.length >= 120 && data.pitch.length <= 500;
      default:
        return false;
    }
  }

  function next() {
    if (!stepValid()) return;
    setError(null);
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    } else {
      submit();
    }
  }

  function back() {
    setError(null);
    if (step > 0) setStep(step - 1);
  }

  function submit() {
    const fd = new FormData();
    fd.append("full_name", data.full_name);
    fd.append("profile_type", data.profile_type);
    fd.append("company_name", data.company_name);
    data.capabilities
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((v) => fd.append("capabilities", v));
    data.partnership_seeking
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((v) => fd.append("partnership_seeking", v));
    data.status_tags.forEach((v) => fd.append("status_tags", v));
    data.i_am.forEach((v) => fd.append("i_am", v));
    data.intent.forEach((v) => fd.append("intent", v));
    data.looking_for.forEach((v) => fd.append("looking_for", v));
    data.industry.forEach((v) => fd.append("industry", v));
    fd.append("stage", data.stage);
    fd.append("location", data.location);
    fd.append("commitment", data.commitment);
    fd.append("runway", data.runway);
    fd.append("experience", data.experience);
    fd.append("pitch", data.pitch);
    fd.append("why_this", data.why_this);
    fd.append("background", data.background);
    fd.append("skills", data.skills);

    startTransition(async () => {
      const result = await saveOnboardingAction(null, fd);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 py-12">
      <StepIndicator current={step} />

      <div className="bg-white border border-line p-8 lg:p-12">
        <div className="text-xs uppercase tracking-[0.25em] text-gold mb-3">
          {tr("Step {n} of IV").replace("{n}", STEPS[step].num)}
        </div>
        <h1 className="text-3xl mb-8">{tr(STEPS[step].title)}</h1>

        {step === 0 && (
          <StepRole
            data={data}
            set={set}
            toggleRole={(v) => toggle("i_am", v)}
            toggleIntent={(v) => toggle("intent", v)}
            toggleLookingFor={(v) => toggle("looking_for", v)}
            tr={tr}
          />
        )}
        {step === 1 && (
          <StepContext
            data={data}
            set={set}
            toggleIndustry={(v) => toggle("industry", v)}
            tr={tr}
          />
        )}
        {step === 2 && <StepConviction data={data} set={set} tr={tr} />}
        {step === 3 && <StepPitch data={data} set={set} tr={tr} />}

        {error && (
          <div className="mt-6 px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
            {error}
          </div>
        )}

        <div className="mt-10 pt-8 border-t border-line flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || isPending}
            className="text-sm text-ink-muted hover:text-navy disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-2 tracking-wide"
          >
            <ArrowLeft className="w-4 h-4" /> {tr("Back")}
          </button>

          <div className="flex items-center gap-4">
            {!stepValid() && (
              <span className="text-xs text-ink-muted">
                {tr(stepMissing(step, data))}
              </span>
            )}
            <button
              type="button"
              onClick={next}
              disabled={!stepValid() || isPending}
              className="px-8 py-4 bg-navy hover:bg-navy-dark disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm tracking-wide transition-colors inline-flex items-center gap-2"
            >
              {step === STEPS.length - 1
                ? isPending
                  ? tr("Saving…")
                  : tr("Complete profile")
                : tr("Continue")}
              {!isPending && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function stepMissing(step: number, d: FormState): string {
  switch (step) {
    case 0:
      if (d.i_am.length === 0) return "Pick at least one role";
      if (d.intent.length === 0) return "Pick what you’re bringing";
      if (d.looking_for.length === 0) return "Pick at least one role to look for";
      return "";
    case 1:
      if (d.industry.length === 0) return "Pick at least one industry";
      if (!d.stage) return "Pick your stage";
      return "";
    case 2:
      if (!d.commitment) return "Pick commitment level";
      if (!d.experience) return "Pick founder experience";
      return "";
    case 3:
      if (d.pitch.length < 120)
        return `Pitch needs ${120 - d.pitch.length} more chars (120 min)`;
      if (d.pitch.length > 500) return "Pitch must be 500 chars or less";
      return "";
    default:
      return "";
  }
}

// ---- Step indicator -------------------------------------------------

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-10 max-w-xl mx-auto">
      {/* Icons + connecting lines */}
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <Fragment key={s.num}>
            <div
              className={`w-10 h-10 border flex items-center justify-center font-serif text-base transition-colors shrink-0 ${
                i < current
                  ? "bg-gold border-gold text-white"
                  : i === current
                    ? "border-gold text-gold"
                    : "border-line text-ink-muted"
              }`}
            >
              {i < current ? <Check className="w-4 h-4" /> : s.num}
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-px mx-2 ${
                  i < current ? "bg-gold" : "bg-line"
                }`}
              />
            )}
          </Fragment>
        ))}
      </div>

      {/* Labels — fixed-width columns aligned under each icon */}
      <div className="flex items-start mt-3">
        {STEPS.map((s, i) => (
          <Fragment key={s.num}>
            <div
              className={`text-[10px] uppercase tracking-[0.2em] whitespace-nowrap w-10 text-center shrink-0 ${
                i === current ? "text-navy font-medium" : "text-ink-muted"
              }`}
            >
              {s.title}
            </div>
            {i < STEPS.length - 1 && <div className="flex-1 mx-2" />}
          </Fragment>
        ))}
      </div>
    </div>
  );
}

// ---- Step 1: Role ---------------------------------------------------

type TR = (s: string) => string;

function StepRole({
  data,
  set,
  toggleRole,
  toggleIntent,
  toggleLookingFor,
  tr,
}: {
  data: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  toggleRole: (v: string) => void;
  toggleIntent: (v: string) => void;
  toggleLookingFor: (v: string) => void;
  tr: TR;
}) {
  return (
    <div className="space-y-10">
      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
          {tr("Your name")}
        </label>
        <input
          type="text"
          value={data.full_name}
          onChange={(e) => set("full_name", e.target.value)}
          maxLength={80}
          placeholder={tr("How you'll appear to other founders")}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      {/* B2B company profile type parked until Phase 3 — community-first focus.
          profile_type stays "individual" by default. Re-enable to bring back
          company profiles in onboarding.
      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {tr("Joining as…")}
        </label>
        <div className="grid grid-cols-2 gap-2">
          <ChoiceButton
            selected={data.profile_type === "individual"}
            onClick={() => set("profile_type", "individual")}
          >
            {tr("Individual")}
          </ChoiceButton>
          <ChoiceButton
            selected={data.profile_type === "company"}
            onClick={() => set("profile_type", "company")}
          >
            {tr("Company")}
          </ChoiceButton>
        </div>
        {data.profile_type === "company" && (
          <div className="mt-4">
            <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
              {tr("Company name")}
            </label>
            <input
              type="text"
              value={data.company_name}
              onChange={(e) => set("company_name", e.target.value)}
              maxLength={100}
              placeholder="e.g. Acme Studios Co. Ltd."
              className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
            />
          </div>
        )}
      </div>
      */}

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {data.profile_type === "company"
            ? tr("Company role… (select all that apply)")
            : tr("I am… (select all that apply)")}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROLES.map((r) => (
            <ChoiceButton
              key={r.value}
              selected={data.i_am.includes(r.value)}
              onClick={() => toggleRole(r.value)}
            >
              {tr(r.label)}
            </ChoiceButton>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {data.profile_type === "company"
            ? tr("We’re bringing… (select all that apply)")
            : tr("I’m bringing… (select all that apply)")}
        </label>
        <div className="space-y-3">
          {INTENTS.map((i) => {
            const sel = data.intent.includes(i.value);
            return (
              <button
                key={i.value}
                type="button"
                onClick={() => toggleIntent(i.value)}
                className={`w-full text-left p-4 border transition-colors ${
                  sel
                    ? "border-navy bg-navy"
                    : "border-line bg-white hover:border-navy"
                }`}
              >
                <div
                  className={`font-serif text-lg mb-1 ${
                    sel ? "text-white" : "text-navy"
                  }`}
                >
                  {tr(i.label)}
                </div>
                <div
                  className={`text-sm leading-relaxed ${
                    sel ? "text-white/80" : "text-ink"
                  }`}
                >
                  {tr(i.description)}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {tr("I’m looking for… (select all that apply)")}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROLES.map((r) => (
            <ChoiceButton
              key={r.value}
              selected={data.looking_for.includes(r.value)}
              onClick={() => toggleLookingFor(r.value)}
            >
              {tr(r.label)}
            </ChoiceButton>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Step 2: Context ------------------------------------------------

function StepContext({
  data,
  set,
  toggleIndustry,
  tr,
}: {
  data: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  toggleIndustry: (v: string) => void;
  tr: TR;
}) {
  return (
    <div className="space-y-10">
      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {tr("Industry focus (select all that apply)")}
        </label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map((i) => (
            <ChoiceButton
              key={i}
              selected={data.industry.includes(i)}
              onClick={() => toggleIndustry(i)}
              compact
            >
              {i}
            </ChoiceButton>
          ))}
          {data.industry
            .filter((i) => !INDUSTRIES.includes(i))
            .map((i) => (
              <ChoiceButton
                key={i}
                selected
                compact
                onClick={() => toggleIndustry(i)}
              >
                {i} ✕
              </ChoiceButton>
            ))}
        </div>
        <input
          type="text"
          placeholder={tr("Other — type and press Enter")}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const v = e.currentTarget.value.trim();
              if (v && !data.industry.includes(v)) toggleIndustry(v);
              e.currentTarget.value = "";
            }
          }}
          className="mt-3 w-full border border-line bg-white px-3 py-2 text-sm text-ink focus:outline-none focus:border-navy"
        />
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {tr("Your stage")}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STAGES.map((s) => (
            <ChoiceButton
              key={s.value}
              selected={data.stage === s.value}
              onClick={() => set("stage", s.value)}
            >
              {tr(s.label)}
            </ChoiceButton>
          ))}
        </div>
      </div>

      <div>
        <label
          htmlFor="location"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Location (optional)")}
        </label>
        <input
          id="location"
          type="text"
          list="thai-provinces"
          value={data.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder={tr("Bangkok, Chiang Mai, Remote, etc.")}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
        <datalist id="thai-provinces">
          {THAI_PROVINCES.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </div>
    </div>
  );
}

// ---- Step 3: Conviction ---------------------------------------------

function StepConviction({
  data,
  set,
  tr,
}: {
  data: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  tr: TR;
}) {
  return (
    <div className="space-y-10">
      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {tr("Commitment level")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {COMMITMENTS.map((c) => (
            <ChoiceButton
              key={c.value}
              selected={data.commitment === c.value}
              onClick={() => set("commitment", c.value)}
            >
              {tr(c.label)}
            </ChoiceButton>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {tr("Financial runway")}{" "}
          <span className="normal-case tracking-normal text-ink-muted">
            ({tr("optional")})
          </span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {RUNWAYS.map((r) => (
            <ChoiceButton
              key={r.value}
              selected={data.runway === r.value}
              onClick={() => set("runway", r.value)}
            >
              {tr(r.label)}
            </ChoiceButton>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {tr("Founder experience")}
        </label>
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCES.map((e) => (
            <ChoiceButton
              key={e.value}
              selected={data.experience === e.value}
              onClick={() => set("experience", e.value)}
            >
              {tr(e.label)}
            </ChoiceButton>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---- Step 4: Pitch --------------------------------------------------

function StepPitch({
  data,
  set,
  tr,
}: {
  data: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  tr: TR;
}) {
  const pitchLen = data.pitch.length;
  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label
            htmlFor="pitch"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted"
          >
            {tr("The pitch (120–500 chars, required)")}
          </label>
          <span
            className={`text-xs ${
              pitchLen < 120 || pitchLen > 500
                ? "text-ink-muted"
                : "text-gold"
            }`}
          >
            {pitchLen < 120
              ? tr("{n} more").replace("{n}", String(120 - pitchLen))
              : `${pitchLen} / 500`}
          </span>
        </div>
        <textarea
          id="pitch"
          value={data.pitch}
          onChange={(e) => set("pitch", e.target.value)}
          rows={6}
          maxLength={500}
          placeholder={tr(
            "Idea-havers: describe your idea. Skill-bringers: describe what you offer. Explorers: describe your interests.",
          )}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy resize-none"
        />
        {data.pitch.length === 0 && (
          <div className="mt-3">
            <div className="text-xs text-ink-muted mb-2">
              {tr("Stuck? Start from one of these:")}
            </div>
            <div className="flex flex-wrap gap-2">
              {PITCH_STARTERS.map((s) => (
                <button
                  key={s.en}
                  type="button"
                  onClick={() => set("pitch", tr(s.template))}
                  className="text-xs px-3 py-1.5 border border-line text-ink hover:border-navy hover:text-navy transition-colors"
                >
                  {tr(s.en)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div>
        <label
          htmlFor="why_this"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Why this, why now (optional)")}
        </label>
        <textarea
          id="why_this"
          value={data.why_this}
          onChange={(e) => set("why_this", e.target.value)}
          rows={3}
          placeholder={tr(
            "What drew you to this problem? Why is now the right time?",
          )}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="background"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Background (optional)")}
        </label>
        <textarea
          id="background"
          value={data.background}
          onChange={(e) => set("background", e.target.value)}
          rows={4}
          maxLength={600}
          placeholder={tr(
            "What you've built, where you've worked or studied — a couple of lines.",
          )}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy resize-none"
        />
      </div>

      <div>
        <label
          htmlFor="skills"
          className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
        >
          {tr("Skills (comma-separated, optional)")}
        </label>
        <input
          id="skills"
          type="text"
          value={data.skills}
          onChange={(e) => set("skills", e.target.value)}
          placeholder="React, B2B Sales, ML/AI, Fundraising"
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
      </div>

      {data.profile_type === "company" && (
        <div>
          <label
            htmlFor="capabilities"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("Capabilities (comma-separated, optional)")}
          </label>
          <input
            id="capabilities"
            type="text"
            value={data.capabilities}
            onChange={(e) => set("capabilities", e.target.value)}
            placeholder="API integrations, Logistics fulfilment, Manufacturing, Distribution"
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
          />
          <p className="text-xs text-ink-muted mt-2">
            {tr(
              "What your company offers to potential partners. Used by other companies to find you.",
            )}
          </p>
        </div>
      )}

      {data.profile_type === "company" && (
        <div>
          <label
            htmlFor="partnership_seeking"
            className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
          >
            {tr("Partners you're seeking (comma-separated, optional)")}
          </label>
          <input
            id="partnership_seeking"
            type="text"
            value={data.partnership_seeking}
            onChange={(e) => set("partnership_seeking", e.target.value)}
            placeholder="payments, logistics, distribution, white-label"
            className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
          />
          <p className="text-xs text-ink-muted mt-2">
            {tr(
              "What capabilities you're looking for in a partner. Companies offering these will see you in their matches.",
            )}
          </p>
        </div>
      )}

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-3">
          {tr("Right now I'm…")}
        </label>
        <div className="flex flex-wrap gap-2">
          {(
            [
              {
                v: "open_to_cofounder" as const,
                en: "Open to co-founder",
                th: "เปิดรับ co-founder",
                hideForCompany: true,
              },
              {
                v: "open_to_partnerships" as const,
                en: "Open to partnerships",
                th: "เปิดรับพาร์ตเนอร์",
              },
              { v: "hiring" as const, en: "Hiring", th: "กำลังจ้าง" },
              { v: "raising" as const, en: "Raising", th: "กำลังระดมทุน" },
              {
                v: "looking_for_advisors" as const,
                en: "Looking for advisors",
                th: "หาที่ปรึกษา",
              },
            ] as const
          )
            .filter(
              (t) =>
                !(
                  "hideForCompany" in t &&
                  t.hideForCompany &&
                  data.profile_type === "company"
                ),
            )
            .map((t) => {
              const selected = data.status_tags.includes(t.v);
              return (
                <button
                  key={t.v}
                  type="button"
                  onClick={() => {
                    set(
                      "status_tags",
                      selected
                        ? data.status_tags.filter((x) => x !== t.v)
                        : [...data.status_tags, t.v].slice(0, 5),
                    );
                  }}
                  className={`px-3 py-1.5 text-sm tracking-wide border transition-colors ${
                    selected
                      ? "bg-navy border-navy text-white"
                      : "bg-white border-line text-ink hover:border-navy"
                  }`}
                >
                  {tr(t.en)}
                </button>
              );
            })}
        </div>
        <p className="text-xs text-ink-muted mt-2">
          {tr(
            "Status signals shown as chips on your profile. Pick what's true today.",
          )}
        </p>
      </div>
    </div>
  );
}

// ---- Choice button --------------------------------------------------

function ChoiceButton({
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
      className={`${compact ? "px-4 py-2" : "px-4 py-3"} text-sm tracking-wide transition-colors border ${
        selected
          ? "bg-navy border-navy text-white"
          : "bg-white border-line text-ink hover:border-navy"
      }`}
    >
      {children}
    </button>
  );
}
