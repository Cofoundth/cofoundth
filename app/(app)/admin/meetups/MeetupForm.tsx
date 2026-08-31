"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Input, Textarea } from "@/components/ui";
import { toBangkokInput, type Meetup } from "@/lib/meetups";

type ActionResult = { error: string } | undefined;
type Action = (state: ActionResult, formData: FormData) => Promise<ActionResult>;

type Props = {
  initial?: Meetup;
  action: Action;
  submitLabel: string;
};

// Admin-facing form — labels stay in English (matching the insights editor);
// only member-facing surfaces are translated.
export function MeetupForm({ initial, action, submitLabel }: Props) {
  const [state, formAction, isPending] = useActionState<ActionResult, FormData>(
    action,
    undefined,
  );
  const [format, setFormat] = useState<"in_person" | "online">(
    initial?.format ?? "in_person",
  );

  return (
    <form action={formAction} className="space-y-6">
      <Input
        id="title"
        name="title"
        label="Title"
        defaultValue={initial?.title}
        required
        maxLength={120}
        placeholder="e.g. Founder Coffee — Bangkok"
      />

      <Textarea
        id="description"
        name="description"
        label="Description"
        defaultValue={initial?.description ?? ""}
        rows={6}
        resize="y"
        maxLength={5000}
        placeholder="What's the meetup about? Who should come? Agenda, etc."
      />

      <div className="grid sm:grid-cols-2 gap-6">
        <Select
          id="format"
          label="Format"
          name="format"
          value={format}
          onChange={(e) =>
            setFormat(e.target.value as "in_person" | "online")
          }
          options={[
            { value: "in_person", label: "In person" },
            { value: "online", label: "Online" },
          ]}
        />
        {format === "in_person" ? (
          <Input
            id="location"
            name="location"
            label="Venue / location"
            defaultValue={initial?.location ?? ""}
            placeholder="e.g. HUBBA Thonglor, Bangkok"
          />
        ) : (
          <Input
            id="online_url"
            name="online_url"
            label="Meeting link"
            type="url"
            defaultValue={initial?.online_url ?? ""}
            placeholder="https://meet.google.com/…"
          />
        )}
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Input
          id="starts_at"
          name="starts_at"
          label="Starts (Bangkok time)"
          type="datetime-local"
          defaultValue={initial ? toBangkokInput(initial.starts_at) : undefined}
          required
        />
        <Input
          id="ends_at"
          name="ends_at"
          label="Ends (optional)"
          type="datetime-local"
          defaultValue={
            initial?.ends_at ? toBangkokInput(initial.ends_at) : undefined
          }
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        <Input
          id="capacity"
          name="capacity"
          label="Capacity"
          type="number"
          min={1}
          defaultValue={initial?.capacity != null ? String(initial.capacity) : ""}
          placeholder="Leave blank for unlimited"
        />
        <Select
          id="status"
          label="Status"
          name="status"
          defaultValue={initial?.status ?? "published"}
          options={[
            { value: "draft", label: "Draft (hidden from members)" },
            { value: "published", label: "Published" },
            { value: "cancelled", label: "Cancelled" },
          ]}
        />
      </div>

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
          href="/admin/meetups"
          className="px-6 py-3 border border-line hover:border-navy text-ink hover:text-navy text-sm tracking-wide"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Select({
  label,
  options,
  id,
  ...props
}: {
  label: string;
  id: string;
  options: { value: string; label: string }[];
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs uppercase tracking-[0.15em] text-ink-muted mb-2"
      >
        {label}
      </label>
      <select
        id={id}
        {...props}
        className="w-full px-4 py-3 border border-line bg-white text-ink focus:outline-none focus:border-navy"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
