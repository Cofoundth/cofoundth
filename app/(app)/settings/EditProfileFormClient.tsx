"use client";

import dynamic from "next/dynamic";
import type { ProfileInitial } from "./EditProfileForm";

// Render the (large) edit form client-side only. SSR-ing the full flat form
// inside this route segment broke segment hydration; deferring it to a
// client mount keeps the page interactive and avoids that path entirely.
const EditProfileForm = dynamic(
  () => import("./EditProfileForm").then((m) => m.EditProfileForm),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-ink-muted py-8">Loading editor…</p>
    ),
  },
);

export function EditProfileFormClient({ initial }: { initial: ProfileInitial }) {
  return <EditProfileForm initial={initial} />;
}
