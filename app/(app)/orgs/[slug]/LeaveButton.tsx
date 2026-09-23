"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { removeMemberAction } from "../actions";
import { useT } from "@/lib/i18n-client";

export function LeaveButton({
  orgId,
  userId,
}: {
  orgId: string;
  userId: string;
}) {
  const tr = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    // LEFT HAND-ROLLED — a decision, not an oversight. Button.tsx's header
    // files this shape ("a secondary that turns red on hover") under
    // `danger-outline`, but that variant is border-danger-line + text-danger-ink
    // AT REST: adopting it repaints this button red before anyone touches it.
    // `secondary` is the right rest state but its hover moves the border to
    // navy and leaves the text alone, where this one takes BOTH to red. Same
    // class of mismatch that reopened D4/D5 in 46a84cd, so it goes to B5 and
    // the founder, not into this batch. The app's only sibling —
    // app/(app)/admin/meetups/MeetupDangerZone.tsx:53 — is still hand-rolled
    // too; they should move together.
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await removeMemberAction(orgId, userId);
          if (!res?.error) router.push("/orgs");
        })
      }
      className="inline-flex items-center gap-2 px-4 py-2 border border-line hover:border-danger-line hover:text-danger-ink disabled:opacity-50 text-ink text-sm transition-colors rounded-xl"
    >
      <LogOut className="w-4 h-4" />
      {pending ? tr("Leaving…") : tr("Leave company")}
    </button>
  );
}
