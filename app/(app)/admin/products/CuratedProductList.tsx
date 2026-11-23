"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { LayoutGrid, List, MessageCircle, Package } from "lucide-react";
import { Paginated } from "@/components/Paginated";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import { CardChip, LinkButton, SectionHeading, ToggleChip, cardClasses, cn } from "@/components/ui";
import { useLocale, useT } from "@/lib/i18n-client";
import { editProductPath, productPath, type ProductRating } from "@/lib/post-types";

type ManagedProduct = {
  id: string;
  title: string | null;
  hidden: boolean;
  cover?: string;
  rating: ProductRating;
  commentCount: number;
  latestComment?: string | null;
};

export function CuratedProductList({ products }: { products: ManagedProduct[] }) {
  const tr = useT();
  const locale = useLocale();
  const grid = useSearchParams().get("view") === "grid";
  const editLabel = tr("Edit product");
  const reviewsLabel = tr("View reviews");

  function selectView(nextGrid: boolean) {
    if (nextGrid === grid) return;
    const url = new URL(window.location.href);
    if (nextGrid) url.searchParams.set("view", "grid");
    else url.searchParams.delete("view");
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SectionHeading title={tr("Curated products")} className="mb-0" />
        <div role="group" aria-label={tr("Product view")} className="flex items-center gap-2">
          <ToggleChip icon={List} selected={!grid} onClick={() => selectView(false)} className="min-h-11">
            {tr("List")}
          </ToggleChip>
          <ToggleChip icon={LayoutGrid} selected={grid} onClick={() => selectView(true)} className="min-h-11">
            {tr("Grid")}
          </ToggleChip>
        </div>
      </div>
      <Paginated
        pageSize={12}
        className={grid
          ? "grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
          : cardClasses({ padding: "none", className: "divide-y divide-line" })}
      >
        {products.map(({ id, title, hidden, cover, rating, commentCount, latestComment }) => {
          const name = title || tr("Untitled");
          const href = productPath(id);
          const commentLabel = tr(commentCount === 1 ? "{n} comment" : "{n} comments")
            .replace("{n}", commentCount.toLocaleString(locale));
          return (
            <article
              key={id}
              className={grid ? cardClasses({
                padding: "none", className: "flex min-w-0 flex-col overflow-hidden ring-1 ring-line",
              }) : undefined}
            >
              {grid && (
                <div className="relative grid aspect-video place-items-center bg-cream">
                  <Package className="size-8 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
                  {cover && (
                    <Image
                      key={cover}
                      src={cover}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
                      referrerPolicy="no-referrer"
                      onError={(event) => { event.currentTarget.hidden = true; }}
                      className="bg-cream object-contain"
                    />
                  )}
                </div>
              )}
              <div className={cn("flex gap-3 p-4", grid
                ? "flex-1 flex-col justify-between"
                : "flex-col sm:flex-row sm:items-center sm:justify-between sm:px-6")}>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h3 className={cn("wrap-anywhere", grid ? "text-xl" : "text-base font-medium")}>
                      <Link href={href} prefetch={false} className="underline-offset-4 hover:underline">
                        {name}
                      </Link>
                    </h3>
                    {hidden && <CardChip>{tr("Hidden")}</CardChip>}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
                    <ProductRatingSummary rating={rating} locale={locale} />
                    <span className="inline-flex items-center gap-1.5">
                      <MessageCircle className="size-4 shrink-0" aria-hidden="true" />
                      {commentLabel}
                    </span>
                  </div>
                  {latestComment && (
                    <blockquote className="mt-2 border-s-2 border-line ps-3 text-sm text-ink-muted">
                      <p className="line-clamp-2 wrap-anywhere">{latestComment}</p>
                    </blockquote>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {(commentCount > 0 || rating.count > 0) && (
                    <LinkButton
                      href={commentCount > 0 ? `${href}#comments` : href}
                      prefetch={false}
                      variant="ghost"
                      size="sm"
                      aria-label={`${reviewsLabel} · ${name}`}
                      className="min-h-11"
                    >
                      {reviewsLabel}
                    </LinkButton>
                  )}
                  <LinkButton
                    href={editProductPath(id)}
                    prefetch={false}
                    variant="secondary"
                    size="sm"
                    aria-label={`${editLabel} · ${name}`}
                    className="min-h-11"
                  >
                    {editLabel}
                  </LinkButton>
                </div>
              </div>
            </article>
          );
        })}
      </Paginated>
    </section>
  );
}
