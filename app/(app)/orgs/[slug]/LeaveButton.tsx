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
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await removeMemberAction(orgId, userId);
          if (!res?.error) router.push("/orgs");
        })
      }
      className="inline-flex items-center gap-2 px-4 py-2 border border-line hover:border-red-400 hover:text-red-700 disabled:opacity-50 text-ink text-sm transition-colors"
    >
      <LogOut className="w-4 h-4" />
      {pending ? tr("Leaving…") : tr("Leave company")}
    </button>
  );
}
