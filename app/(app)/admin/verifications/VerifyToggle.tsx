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
          ? // gold is a SURFACE token now: white on #E9E2D4 is 1.3:1, so the
            // word and the glyph both vanished. On-state uses the primary.
            "bg-navy border-navy text-white hover:bg-white hover:border-line hover:text-navy"
          : "bg-white border-line text-ink hover:border-navy hover:text-navy"
      }`}
    >
      <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} />
      {verified ? "Verified" : "Verify"}
    </button>
  );
}
