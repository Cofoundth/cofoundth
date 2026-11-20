"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, Square } from "lucide-react";
import { ToggleChip, cn } from "@/components/ui";
import { useT } from "@/lib/i18n-client";
import { parseProductView, VIEW_PARAM, type ProductView } from "./deck-position";

export function useProductView() {
  return parseProductView(useSearchParams().getAll(VIEW_PARAM));
}

export function ProductViewSwitch({ className }: { className?: string }) {
  const tr = useT();
  const view = useProductView();

  function select(next: ProductView) {
    if (next === view) return;
    const url = new URL(window.location.href);
    if (next === "grid") url.searchParams.set(VIEW_PARAM, next);
    else url.searchParams.delete(VIEW_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <div
      role="group"
      aria-label={tr("Product view")}
      className={cn("inline-flex shrink-0 rounded-full border border-line bg-white p-0.5", className)}
    >
      <ToggleChip
        icon={Square}
        selected={view === "single"}
        onClick={() => select("single")}
        className="whitespace-nowrap border-transparent px-2.5"
      >
        <span className="sr-only min-[25rem]:not-sr-only">{tr("Card")}</span>
      </ToggleChip>
      <ToggleChip
        icon={LayoutGrid}
        selected={view === "grid"}
        onClick={() => select("grid")}
        className="whitespace-nowrap border-transparent px-2.5"
      >
        <span className="sr-only min-[25rem]:not-sr-only">{tr("Grid")}</span>
      </ToggleChip>
    </div>
  );
}

export function ProductShelfFrame({ children }: { children: ReactNode }) {
  const view = useProductView();
  return (
    <div
      data-deck-page=""
      className={
        view === "grid"
          ? "flex min-h-dvh flex-col in-data-[shell=public]:min-h-[calc(100dvh-4.0625rem)] md:in-data-[shell=public]:min-h-dvh"
          : "flex h-dvh min-h-0 flex-col overflow-clip max-md:in-data-[shell=public]:h-[calc(100dvh-4.0625rem)]"
      }
    >
      {children}
    </div>
  );
}
