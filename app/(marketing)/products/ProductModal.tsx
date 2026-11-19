"use client";

// A product's own page, over the deck (the founder's call, 2026-11-18): a tap
// on a card, its ↑ button, ↑ on the deck or its rating row opens it here, so a
// reader can read the comments, rate it and try it without losing their place.
//
// ── WHY A SEARCH PARAMETER, NOT AN INTERCEPTED ROUTE ──────────────────────
// It lives at `?product=<id>` on the deck's own address (/ or /products), and
// ./ProductShelf.tsx renders it, server-side, with the same ProductPageBody
// that /products/<id> renders, so the product cannot read differently here.
// Next keys a page by its path, not its search parameters
// (createRouterCacheKey(segment, true)), so adding and removing the parameter
// never remounts the deck: its card, its filter and its stack stay exactly
// where they were. An intercepted /products/<id> would have done neither job:
// interception rewrites run before the filesystem, keyed on the page you come
// FROM, so one under / would catch product links from every page of the site,
// and one under /products would catch /products/new and /products/mine too.
//
// ── CLOSING ────────────────────────────────────────────────────────────────
// ✕, Escape and a click on the scrim (components/ui/Dialog.tsx, which also
// traps focus and locks the page behind it). When the deck opened it in this
// tab (./product-modal-state.ts), closing is a Back, so the history has no
// entry left that would reopen it; from a shared link or a reload it replaces
// its own address without the parameter instead. Browser Back closes it too:
// the parameter goes, and ./ProductShelf.tsx stops rendering it. A comment
// half-written in the box below is asked about first, because closing
// unmounts it and the text would be gone.
//
// The comments, the stars and the like inside are the page's own controls.
// Their actions revalidate, and Next re-renders the current route after a
// revalidating action, which is this deck, modal included — so a new comment
// appears here as it does on the page.

import { useRouter } from "next/navigation";
import { useCallback, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { Dialog } from "@/components/ui";
import { PRODUCT_PARAM } from "./deck-position";
import { takeOpenedFromDeck } from "./product-modal-state";

export function ProductModal({
  productId,
  name,
  closeLabel,
  discardLabel,
  children,
}: {
  productId: string;
  /** The dialog's accessible name: the product's. */
  name: string;
  /** The ✕, which has no visible text. Already translated. */
  closeLabel: string;
  /** Asked before closing over a half-written comment. Already translated. */
  discardLabel: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const bodyRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => {
    const draft = Array.from(
      bodyRef.current?.querySelectorAll("textarea") ?? [],
    ).some((t) => t.value.trim() !== "");
    if (draft && !window.confirm(discardLabel)) return;
    if (takeOpenedFromDeck(productId)) {
      router.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete(PRODUCT_PARAM);
    router.replace(`${url.pathname}${url.search}`, { scroll: false });
  }, [router, productId, discardLabel]);

  return (
    <Dialog
      onClose={close}
      ariaLabel={name}
      size="2xl"
      padding="none"
      // The overlay surface every modal uses (components/ui/Dialog.tsx, D1),
      // at the product page's own width and on its ground: its cards are
      // white on the app's cream, as on /products/<id>.
      panelClassName="max-w-[1120px] bg-cream"
    >
      {/* Sticky in the scrim, which is what scrolls, so the ✕ stays in reach
          down a long thread. Zero height: it takes no room above the page. */}
      <div className="sticky top-0 z-30 flex h-0 justify-end">
        <button
          type="button"
          onClick={close}
          aria-label={closeLabel}
          className="mt-3 mr-3 grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-white text-navy shadow-lg hover:bg-cream"
        >
          <X className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>
      <div ref={bodyRef}>{children}</div>
    </Dialog>
  );
}

/** What the modal shows while the product streams in: one card's worth of
 *  quiet surface, at the body's own padding (ProductPageBody, MODAL_BODY). */
export function ProductModalSkeleton() {
  return (
    <div aria-hidden="true" className="px-4 pt-14 pb-8 sm:px-6 lg:px-8">
      <div className="h-[min(22rem,70dvh)] animate-pulse rounded-3xl bg-white/70 motion-reduce:animate-none" />
    </div>
  );
}
