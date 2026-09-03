"use client";

import { useActionState, useState } from "react";
import { Building2 } from "lucide-react";
import { createOrgAction, type OrgFormState } from "../actions";
import { OrgLogoField, OrgProductImagesField } from "./OrgImageFields";
import { useT } from "@/lib/i18n-client";
import { LONG_TEXT_MAX } from "@/lib/limits";
import { INDUSTRIES } from "@/lib/industries";
import Combobox from "@/components/Combobox";

const INITIAL: OrgFormState = null;
const PITCH_MAX = LONG_TEXT_MAX;

const STAGES: { value: string; en: string }[] = [
  { value: "idea", en: "Idea" },
  { value: "building", en: "Building" },
  { value: "launched", en: "Launched" },
  { value: "raising", en: "Raising" },
  { value: "scaling", en: "Scaling" },
];

const inputCls =
  "w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy";

// The app's section register: 18px / 700 / normal tracking. Both overrides are
// load-bearing — @layer base sets every h1-h6 to weight 600 and -0.02em, so
// without font-bold + tracking-normal this silently renders as display type.
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h2 className="text-lg font-bold tracking-normal border-b border-line pb-2">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
        {label}
        {required && <span className="text-gold-ink ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted mt-1.5">{hint}</p>}
    </div>
  );
}

export function CreateOrgForm() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<OrgFormState, FormData>(
    createOrgAction,
    INITIAL,
  );
  const [industry, setIndustry] = useState<string[]>([]);
  const [pitch, setPitch] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [productImages, setProductImages] = useState<string[]>([]);
  const [productUrl, setProductUrl] = useState("");

  const pitchLen = pitch.trim().length;
  const pitchTooLong = pitchLen > PITCH_MAX;
  const canSubmit =
    !isPending &&
    pitchLen > 0 &&
    !pitchTooLong &&
    !!logoUrl &&
    productImages.length > 0 &&
    productUrl.trim().length > 0;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="logo_url" value={logoUrl ?? ""} />
      <input
        type="hidden"
        name="product_images"
        value={JSON.stringify(productImages)}
      />

      <Section title={tr("The company")}>
      <Field label={tr("Company name")} required>
        <input
          name="name"
          type="text"
          required
          minLength={2}
          maxLength={80}
          placeholder={tr("e.g. Siam Robotics")}
          className={inputCls}
        />
      </Field>

      <Field label={tr("Company logo")} required>
        <OrgLogoField value={logoUrl} onChange={setLogoUrl} />
      </Field>

      <Field label={tr("Tagline")} hint={tr("One line on what you do.")}>
        <input
          name="tagline"
          type="text"
          maxLength={140}
          placeholder={tr("e.g. Warehouse automation for Thai SMEs")}
          className={inputCls}
        />
      </Field>

      <Field
        label={tr("What your company does")}
        required
        hint={tr("Up to ~200 words. What you build, for whom, and the value.")}
      >
        <textarea
          name="pitch"
          rows={5}
          value={pitch}
          onChange={(e) => setPitch(e.target.value)}
          maxLength={PITCH_MAX}
          placeholder={tr(
            "e.g. We build warehouse-automation software that cuts fulfilment time for Thai online sellers by half.",
          )}
          className={`${inputCls} resize-y`}
        />
        <div
          className={`text-right text-xs mt-1 tabular-nums ${
            pitchTooLong ? "text-red-700" : "text-ink-muted"
          }`}
        >
          {pitchLen} / {PITCH_MAX}
        </div>
      </Field>

      </Section>

      <Section title={tr("What you're building")}>
      <Field label={tr("Product link")} required>
        <input
          name="product_url"
          type="url"
          required
          value={productUrl}
          onChange={(e) => setProductUrl(e.target.value)}
          placeholder="https://…"
          className={inputCls}
        />
      </Field>

      <Field label={tr("Product images")} required>
        <OrgProductImagesField value={productImages} onChange={setProductImages} />
      </Field>

      <Field
        label={tr("What are you looking for?")}
        hint={tr("This places your company under these tabs in the directory.")}
      >
        <div className="flex flex-col gap-2">
          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input
              type="checkbox"
              name="seeking"
              value="partner"
              defaultChecked
            />
            {tr("A business partner")}
          </label>
          <label className="inline-flex items-center gap-2 text-sm text-ink cursor-pointer">
            <input type="checkbox" name="seeking" value="funding" />
            {tr("Funding from investors")}
          </label>
        </div>
      </Field>

      </Section>

      {/* Was a 12px all-caps eyebrow doing an 18px section heading's job — the
          exact pattern the section register exists to replace. */}
      <Section title={tr("Optional details")}>
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 gap-6">
            <Field label={tr("Location")}>
              <input
                name="location"
                type="text"
                maxLength={80}
                placeholder={tr("e.g. Bangkok")}
                className={inputCls}
              />
            </Field>
            <Field label={tr("Stage")}>
              <select name="stage" defaultValue="" className={inputCls}>
                <option value="">{tr("Select…")}</option>
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {tr(s.en)}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {/* The SAME taxonomy the founder directory uses. This was free
              text, so a company could say "Tech" while every founder profile
              said "Software & IT Services" — two names for one thing, and the
              company search on /companies matches org industries as plain text,
              so the mismatch quietly cost relevance. Controlled vocabulary now;
              the action whitelists it again server-side. */}
          <Field label={tr("Industry")}>
            {industry.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {industry.map((i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() =>
                      setIndustry((s) => s.filter((x) => x !== i))
                    }
                    className="px-3 py-1.5 text-sm bg-navy border border-navy text-white rounded-full"
                  >
                    {i} ✕
                  </button>
                ))}
              </div>
            )}
            <Combobox
              options={INDUSTRIES.filter((i) => !industry.includes(i))}
              value=""
              onChange={(v) => {
                const picked = v.trim();
                if (picked && INDUSTRIES.includes(picked))
                  setIndustry((s) =>
                    s.includes(picked) ? s : [...s, picked],
                  );
              }}
              placeholder={tr("Search industries")}
              allowCustom={false}
              className={inputCls}
              emptyText={tr("No matches")}
            />
            {industry.map((i) => (
              <input key={i} type="hidden" name="industry" value={i} />
            ))}
          </Field>

          <Field label={tr("What we offer")} hint={tr("Separate with commas")}>
            <input
              name="capabilities"
              type="text"
              placeholder={tr("e.g. Software, inventory tools, mobile app")}
              className={inputCls}
            />
          </Field>

          <Field
            label={tr("Partnerships we're seeking")}
            hint={tr("Separate with commas")}
          >
            <input
              name="partnership_seeking"
              type="text"
              placeholder={tr("e.g. Media companies, ad agencies, influencers")}
              className={inputCls}
            />
          </Field>
        </div>
      </Section>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800 rounded-xl">
          {tr(state.error)}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-end">
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm tracking-wide transition-colors"
        >
          <Building2 className="w-4 h-4" />
          {isPending ? tr("Creating…") : tr("Create company")}
        </button>
      </div>
    </form>
  );
}
