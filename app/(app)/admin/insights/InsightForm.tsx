"use client";

import Link from "next/link";
import { useActionState } from "react";
import type { Insight } from "@/lib/insights";

type ActionResult = { error: string } | undefined;
type Action = (state: ActionResult, formData: FormData) => Promise<ActionResult>;

type Props = {
  initial?: Insight;
  action: Action;
  submitLabel: string;
};

export function InsightForm({ initial, action, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined,
  );

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-6">
        <Field label="Title" name="title" defaultValue={initial?.title} required />
        <Field label="Slug" name="slug" defaultValue={initial?.slug} required hint="lowercase-with-hyphens" />
        <Field label="Category" name="category" defaultValue={initial?.category} required />
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Locale"
            name="locale"
            defaultValue={initial?.locale ?? "en"}
            options={[
              { value: "en", label: "English" },
              { value: "th", label: "ไทย" },
            ]}
          />
          <Field
            label="Read (min)"
            name="reading_time"
            defaultValue={String(initial?.reading_time ?? 5)}
            type="number"
            min={1}
            max={120}
          />
        </div>
      </div>

      <TextArea
        label="Excerpt"
        name="excerpt"
        defaultValue={initial?.excerpt}
        rows={3}
        required
        hint="Shown on the index page. 1–500 chars."
      />

      <TextArea
        label="Body"
        name="body"
        defaultValue={initial?.body}
        rows={18}
        required
        hint="Markdown supported — paragraphs separated by blank lines, **bold** for emphasis."
        mono
      />

      <Select
        label="Status"
        name="status"
        defaultValue={initial?.status ?? "draft"}
        options={[
          { value: "draft", label: "Draft" },
          { value: "published", label: "Published" },
        ]}
      />

      {state?.error && (
        <div className="px-4 py-3 border border-red-300 bg-red-50 text-sm text-red-800">
          {state.error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-4 border-t border-line">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-3 bg-navy hover:bg-navy-dark disabled:opacity-60 text-white text-sm tracking-wide"
        >
          {isPending ? "Saving…" : submitLabel}
        </button>
        <Link
          href="/admin/insights"
          className="px-6 py-3 border border-line hover:border-navy text-ink hover:text-navy text-sm tracking-wide"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  ...props
}: {
  label: string;
  hint?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
        {label}
      </div>
      <input
        {...props}
        className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
      />
      {hint && <div className="text-xs text-ink-muted mt-1">{hint}</div>}
    </label>
  );
}

function TextArea({
  label,
  hint,
  mono,
  ...props
}: {
  label: string;
  hint?: string;
  mono?: boolean;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
        {label}
      </div>
      <textarea
        {...props}
        className={`w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy ${
          mono ? "font-mono text-sm" : ""
        }`}
      />
      {hint && <div className="text-xs text-ink-muted mt-1">{hint}</div>}
    </label>
  );
}

function Select({
  label,
  options,
  ...props
}: {
  label: string;
  options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-[0.15em] text-ink-muted mb-2">
        {label}
      </div>
      <select
        {...props}
        className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
