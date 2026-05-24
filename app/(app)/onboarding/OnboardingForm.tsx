"use client";

import { Fragment, useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { saveOnboardingAction } from "./actions";
import { useT } from "@/lib/i18n-client";

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

const INDUSTRIES = [
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

// ---- Types ----------------------------------------------------------

type FormState = {
  profile_type: "individual" | "company";
  company_name: string;
  capabilities: string;
  i_am: string;
  intent: string;
  looking_for: string[];
  industry: string[];
  stage: string;
  location: string;
  commitment: string;
  runway: string;
  experience: string;
  pitch: string;
  why_this: string;
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
    profile_type: "individual",
    company_name: "",
    capabilities: "",
    i_am: "",
    intent: "",
    looking_for: [],
    industry: [],
    stage: "",
    location: "",
    commitment: "",
    runway: "",
    experience: "",
    pitch: "",
    why_this: "",
    skills: "",
    ...initial,
  });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  function toggle(key: "looking_for" | "industry", value: string) {
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
        if (data.profile_type === "company" && !data.company_name.trim())
          return false;
        return !!data.i_am && !!data.intent && data.looking_for.length > 0;
      case 1:
        return data.industry.length > 0 && !!data.stage;
      case 2:
        return !!data.commitment && !!data.runway && !!data.experience;
      case 3:
        return data.pitch.length >= 200 && data.pitch.length <= 500;
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
    fd.append("profile_type", data.profile_type);
    fd.append("company_name", data.company_name);
    data.capabilities
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean)
      .forEach((v) => fd.append("capabilities", v));
    fd.append("i_am", data.i_am);
    fd.append("intent", data.intent);
    data.looking_for.forEach((v) => fd.append("looking_for", v));
    data.industry.forEach((v) => fd.append("industry", v));
    fd.append("stage", data.stage);
    fd.append("location", data.location);
    fd.append("commitment", data.commitment);
    fd.append("runway", data.runway);
    fd.append("experience", data.experience);
    fd.append("pitch", data.pitch);
    fd.append("why_this", data.why_this);
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
      if (!d.i_am) return "Pick your role";
      if (!d.intent) return "Pick what you’re bringing";
      if (d.looking_for.length === 0) return "Pick at least one role to look for";
      return "";
    case 1:
      if (d.industry.length === 0) return "Pick at least one industry";
      if (!d.stage) return "Pick your stage";
      return "";
    case 2:
      if (!d.commitment) return "Pick commitment level";
      if (!d.runway) return "Pick runway";
      if (!d.experience) return "Pick founder experience";
      return "";
    case 3:
      if (d.pitch.length < 200)
        return `Pitch needs ${200 - d.pitch.length} more chars (200 min)`;
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
  toggleLookingFor,
  tr,
}: {
  data: FormState;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
  toggleLookingFor: (v: string) => void;
  tr: TR;
}) {
  return (
    <div className="space-y-10">
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

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {data.profile_type === "company" ? tr("Company role…") : tr("I am…")}
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ROLES.map((r) => (
            <ChoiceButton
              key={r.value}
              selected={data.i_am === r.value}
              onClick={() => set("i_am", r.value)}
            >
              {tr(r.label)}
            </ChoiceButton>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-4">
          {data.profile_type === "company"
            ? tr("We’re bringing…")
            : tr("I’m bringing…")}
        </label>
        <div className="space-y-3">
          {INTENTS.map((i) => (
            <button
              key={i.value}
              type="button"
              onClick={() => set("intent", i.value)}
              className={`w-full text-left p-4 border transition-colors ${
                data.intent === i.value
                  ? "border-navy bg-cream"
                  : "border-line bg-white hover:border-navy"
              }`}
            >
              <div className="font-serif text-lg text-navy mb-1">
                {tr(i.label)}
              </div>
              <div className="text-sm text-ink leading-relaxed">
                {tr(i.description)}
              </div>
            </button>
          ))}
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
        </div>
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
          value={data.location}
          onChange={(e) => set("location", e.target.value)}
          placeholder={tr("Bangkok, Chiang Mai, Remote, etc.")}
          className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
        />
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
          {tr("Financial runway")}
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
            {tr("The pitch (200–500 chars, required)")}
          </label>
          <span
            className={`text-xs ${
              pitchLen < 200 || pitchLen > 500
                ? "text-ink-muted"
                : "text-gold"
            }`}
          >
            {pitchLen} / 500
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
