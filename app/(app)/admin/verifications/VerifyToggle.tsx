"use client";

import { useTransition } from "react";
import { BadgeCheck } from "lucide-react";
import { toggleVerifiedAction } from "./actions";

type Props = {
  profileId: string;
  verified: boolean;
};

export function VerifyToggle({ profileId, verified }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await toggleVerifiedAction(profileId, !verified);
        });
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs tracking-wide border transition-colors disabled:opacity-60 ${
        verified
          ? "bg-gold border-gold text-white hover:bg-navy hover:border-navy"
          : "bg-white border-line text-ink hover:border-gold hover:text-gold"
      }`}
    >
      <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} />
      {verified ? "Verified" : "Verify"}
    </button>
  );
}
