"use client";

// The reference product's create flow: step 1 is a grid of big category
// tiles ("Pick a format to start meeting other founders"), Next reveals the
// details. Same wizard here, used in two places — the create modal on the
// list page and the standalone /meetups/new page — so the flow is identical
// wherever it starts.

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n-client";
import { MEETUP_CATEGORIES, type MeetupCategory } from "@/lib/meetups";
import { HostMeetupForm } from "./new/HostMeetupForm";

export function HostMeetupWizard() {
  const tr = useT();
  const [category, setCategory] = useState<MeetupCategory | null>(null);

  if (category === null) {
    return (
      <div>
        <p className="text-sm text-ink-muted mb-5">
          {tr("Pick a format to start meeting other founders.")}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {(
            Object.entries(MEETUP_CATEGORIES) as [
              MeetupCategory,
              { emoji: string; label: string },
            ][]
          ).map(([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              className="flex flex-col items-center gap-2 rounded-xl border border-line bg-white px-4 py-5 text-sm text-ink hover:border-navy transition-colors"
            >
              <span className="text-2xl" aria-hidden="true">
                {c.emoji}
              </span>
              {tr(c.label)}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setCategory(null)}
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-navy"
      >
        <ArrowLeft className="w-4 h-4" />
        {MEETUP_CATEGORIES[category].emoji} {tr(MEETUP_CATEGORIES[category].label)}
      </button>
      <HostMeetupForm fixedCategory={category} />
    </div>
  );
}
