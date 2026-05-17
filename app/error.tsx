"use client";

import { useEffect } from "react";
import Link from "next/link";

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
        <div className="font-serif text-7xl text-gold mb-6 leading-none">
          —
        </div>
        <h1 className="text-3xl mb-3">Something went wrong</h1>
        <p className="text-ink mb-8 leading-relaxed">
          An unexpected error occurred. Try again, or head back home.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-navy hover:bg-navy-dark text-white text-sm tracking-wide transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 border border-line hover:border-navy text-ink text-sm tracking-wide transition-colors"
          >
            Back to home
          </Link>
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
