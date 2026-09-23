"use client";

import { useTransition } from "react";
import { BadgeCheck } from "lucide-react";
import { ToggleChip } from "@/components/ui";
import { toggleVerifiedAction } from "./actions";

type Props = {
  profileId: string;
  verified: boolean;
};

export function VerifyToggle({ profileId, verified }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <ToggleChip
      selected={verified}
      size="xs-wide"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await toggleVerifiedAction(profileId, !verified);
        });
      }}
      // The primitive has no disabled style and no hover on its ON state; this
      // toggle inverts to the off face on hover, which is its whole affordance.
      // (gold is a SURFACE token: white on #E9E2D4 is 1.3:1, so the on-state
      // uses the primary, never gold.)
      className={`disabled:opacity-60 ${
        verified ? "hover:bg-white hover:border-line hover:text-navy" : ""
      }`}
    >
      <BadgeCheck className="w-3.5 h-3.5" strokeWidth={2} />
      {verified ? "Verified" : "Verify"}
    </ToggleChip>
  );
}
