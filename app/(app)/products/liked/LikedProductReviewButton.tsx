"use client";

import { useState } from "react";
import { ReviewDialog, type PromptProduct } from "@/app/(marketing)/products/DeckPrompts";
import { Button } from "@/components/ui";
import { useT } from "@/lib/i18n-client";

export function LikedProductReviewButton({
  product,
  allowTryConfirmation,
}: {
  product: PromptProduct;
  allowTryConfirmation: boolean;
}) {
  const tr = useT();
  const [open, setOpen] = useState(false);
  const [savedScore, setSavedScore] = useState<number | null>(null);

  return (
    <>
      <Button
        variant="secondary"
        size="sm"
        className="min-h-11"
        aria-haspopup="dialog"
        aria-label={tr("Review {name}").replace("{name}", () => product.name)}
        onClick={(event) => {
          event.currentTarget.focus({ preventScroll: true });
          setOpen(true);
        }}
      >
        {tr("Review")}
      </Button>
      {open && (
        <ReviewDialog
          product={product}
          initialScore={savedScore ?? product.myScore}
          allowTryConfirmation={allowTryConfirmation}
          onSaved={(_, score) => setSavedScore(score)}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
