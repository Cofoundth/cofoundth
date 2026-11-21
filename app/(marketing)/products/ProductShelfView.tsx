"use client";

import { useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, Menu, Square } from "lucide-react";
import { Button, Dialog, ToggleChip, cn } from "@/components/ui";
import { useT } from "@/lib/i18n-client";
import { parseProductView, VIEW_PARAM, type ProductView } from "./deck-position";

export function useProductView() {
  return parseProductView(useSearchParams().getAll(VIEW_PARAM));
}

const VIEW_CHIP = "px-2.5 whitespace-nowrap max-md:size-9 max-md:rounded-lg max-md:border-0 max-md:bg-transparent max-md:px-0 max-md:text-ink-muted max-md:aria-pressed:bg-gold-soft max-md:aria-pressed:text-navy";

export function ProductViewSwitch({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const tr = useT();
  const view = useProductView();

  function select(next: ProductView) {
    if (next === view) return;
    const url = new URL(window.location.href);
    if (next === "grid") url.searchParams.set(VIEW_PARAM, next);
    else url.searchParams.delete(VIEW_PARAM);
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  const nextView = view === "grid" ? "single" : "grid";
  const NextViewIcon = nextView === "grid" ? LayoutGrid : Square;
  const nextViewLabel = tr(nextView === "grid" ? "Switch to grid view" : "Switch to card view");

  return (
    <>
      {compact && (
        <Button
          variant="ghost"
          aria-label={nextViewLabel}
          title={nextViewLabel}
          onClick={() => select(nextView)}
          className={cn("size-11 rounded-lg p-0 md:hidden", className)}
        >
          <NextViewIcon className="size-5" aria-hidden="true" />
        </Button>
      )}
      <div
        role="group"
        aria-label={tr("Product view")}
        className={cn("inline-flex shrink-0 items-center gap-1", compact && "max-md:hidden", className)}
      >
        <ToggleChip
          icon={Square}
          selected={view === "single"}
          onClick={() => select("single")}
          className={VIEW_CHIP}
        >
          <span className="sr-only md:not-sr-only">{tr("Card")}</span>
        </ToggleChip>
        <ToggleChip
          icon={LayoutGrid}
          selected={view === "grid"}
          onClick={() => select("grid")}
          className={VIEW_CHIP}
        >
          <span className="sr-only md:not-sr-only">{tr("Grid")}</span>
        </ToggleChip>
      </div>
    </>
  );
}

export function ProductShelfAccountMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const tr = useT();
  const label = tr("Account");

  return (
    <>
      <Button
        variant="ghost"
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="col-start-4 row-start-1 size-11 rounded-lg p-0 md:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="size-5" aria-hidden="true" />
      </Button>
      {open && (
        <Dialog
          ariaLabel={label}
          closeButton="overlay"
          closeLabel={tr("Close")}
          onClose={() => setOpen(false)}
          size="narrow"
        >
          <h2 className="mb-4 text-lg font-medium">{label}</h2>
          <div className="grid gap-4">{children}</div>
        </Dialog>
      )}
    </>
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
