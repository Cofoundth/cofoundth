"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setActiveOrgAction } from "@/app/(app)/orgs/active-org-actions";

// Shown only when the user belongs to more than one company — lets them pick
// which company they're acting as (connect / propose / chat sender).
export function OrgSwitcher({
  orgs,
  activeId,
}: {
  orgs: { id: string; name: string }[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  if (orgs.length < 2) return null;

  return (
    <select
      value={activeId}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        start(async () => {
          await setActiveOrgAction(next);
          router.refresh();
        });
      }}
      className="text-xs px-2 py-1 border border-line bg-white text-ink focus:outline-none focus:border-navy disabled:opacity-50 max-w-[10rem]"
      aria-label="Acting as company"
    >
      {orgs.map((o) => (
        <option key={o.id} value={o.id}>
          {o.name}
        </option>
      ))}
    </select>
  );
}
