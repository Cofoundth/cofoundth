"use client";

import { useActionState, useState } from "react";
import { Building2 } from "lucide-react";
import { createOrgAction, type OrgFormState } from "../actions";
import { useT } from "@/lib/i18n-client";

const INITIAL: OrgFormState = null;

const STAGES: { value: string; en: string }[] = [
  { value: "idea", en: "Idea" },
  { value: "building", en: "Building" },
  { value: "launched", en: "Launched" },
  { value: "raising", en: "Raising" },
  { value: "scaling", en: "Scaling" },
];

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-ink-muted mt-1.5">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy";

export function CreateOrgForm() {
  const tr = useT();
  const [state, formAction, isPending] = useActionState<OrgFormState, FormData>(
    createOrgAction,
    INITIAL,
  );
  const [about, setAbout] = useState("");

  return (
    <form action={formAction} className="space-y-6">
      <Field label={tr("Company name")}>
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

      <Field label={tr("Tagline")} hint={tr("One line on what you do.")}>
        <input
          name="tagline"
          type="text"
          maxLength={140}
          placeholder={tr("e.g. Warehouse automation for Thai SMEs")}
          className={inputCls}
        />
      </Field>

      <Field label={tr("About")}>
        <textarea
          name="about"
          rows={6}
          maxLength={2000}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder={tr(
            "What the company does, who it's for, and where you're headed.",
          )}
          className={`${inputCls} resize-y`}
        />
        <div className="text-right text-xs text-ink-muted mt-1 tabular-nums">
          {about.length} / 2000
        </div>
      </Field>

      <div className="grid sm:grid-cols-2 gap-6">
        <Field label={tr("Website")}>
          <input
            name="website"
            type="url"
            placeholder="https://…"
            className={inputCls}
          />
        </Field>
        <Field label={tr("Location")}>
          <input
            name="location"
            type="text"
            maxLength={80}
            placeholder={tr("e.g. Bangkok")}
            className={inputCls}
          />
        </Field>
      </div>

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

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {tr(state.error)}
        </div>
      )}

      <div className="pt-4 border-t border-line flex items-center justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-2 px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm tracking-wide transition-colors"
        >
          <Building2 className="w-4 h-4" />
          {isPending ? tr("Creating…") : tr("Create company")}
        </button>
      </div>
    </form>
  );
}
