"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="font-serif text-num3 text-gold-ink mb-6">
          —
        </div>
        <h1 className="text-d2 mb-3">Something went wrong</h1>
        <p className="text-ink mb-8 leading-relaxed">
          An unexpected error occurred. Try again, or head back home.
        </p>
        <div className="flex gap-3 justify-center">
          <Button onClick={reset}>Try again</Button>
          {/* rounded-xl, not the primitive's pill: at HEAD this link rendered
              at 14px next to a pilled sibling (@layer base rounds <button>, not
              the <a> a Link renders). Preserved so the migration stays a pixel
              no-op; unifying the pair is a design call, not a sweep. */}
          <LinkButton variant="secondary" href="/" className="rounded-xl">
            Back to home
          </LinkButton>
        </div>
        {error.digest && (
          <p className="text-xs text-ink-muted mt-8 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
