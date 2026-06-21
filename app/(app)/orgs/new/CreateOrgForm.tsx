"use client";

import { useActionState, useState } from "react";
import { Building2 } from "lucide-react";
import { createOrgAction, type OrgFormState } from "../actions";
import { OrgLogoField, OrgProductImagesField } from "./OrgImageFields";
import { useT } from "@/lib/i18n-client";
import { LONG_TEXT_MAX } from "@/lib/limits";

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
        {required && <span className="text-gold ml-1">*</span>}
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
        label={tr("Schedule-a-call link (Calendly)")}
        hint={tr("Shown to companies you connect with, for booking a call.")}
      >
        <input
          name="calendly_url"
          type="url"
          placeholder="https://calendly.com/…"
          className={inputCls}
        />
      </Field>

      <div className="border-t border-line pt-6">
        <p className="text-xs uppercase tracking-[0.2em] text-ink-muted mb-4">
          {tr("Optional")}
        </p>
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

          <Field
            label={tr("Industry")}
            hint={tr("Comma-separated, e.g. Logistics, SaaS")}
          >
            <input name="industry" type="text" className={inputCls} />
          </Field>

          <Field
            label={tr("What we offer")}
            hint={tr("Comma-separated capabilities partners can tap into.")}
          >
            <input name="capabilities" type="text" className={inputCls} />
          </Field>

          <Field
            label={tr("Partnerships we're seeking")}
            hint={tr("Comma-separated — what kind of partners you want.")}
          >
            <input name="partnership_seeking" type="text" className={inputCls} />
          </Field>
        </div>
      </div>

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
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
