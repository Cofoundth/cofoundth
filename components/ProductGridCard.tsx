import Image from "next/image";
import Link from "next/link";
import type { MouseEventHandler, ReactNode } from "react";
import { Package } from "lucide-react";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import { Card, CardChip } from "@/components/ui";
import { t, type Locale } from "@/lib/i18n";
import type { ProductRating } from "@/lib/post-types";
import { CURATED_PRODUCT_LABEL } from "@/lib/curated-products";

export function ProductGridCard({
  href,
  name,
  cover,
  rating,
  likeCount,
  mobileOnly,
  curated,
  locale,
  onClick,
  actions,
}: {
  href: string;
  name: string;
  cover?: string;
  rating: ProductRating;
  likeCount?: number;
  mobileOnly: boolean;
  curated?: boolean;
  locale: Locale;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
  actions?: ReactNode;
}) {
  return (
    <Card
      padding="none"
      className="flex h-full flex-col overflow-hidden border border-ink-muted/40 transition-shadow hover:shadow-md"
    >
      <Link
        href={href}
        prefetch={false}
        onClick={onClick}
        aria-haspopup={onClick ? "dialog" : undefined}
        className="group block flex-1 rounded-3xl focus-visible:-outline-offset-4"
      >
        <div className="relative grid aspect-video place-items-center bg-cream">
          {cover ? (
            <Image
              src={cover}
              alt=""
              fill
              unoptimized
              sizes="(min-width: 1280px) 350px, (min-width: 1024px) 30vw, (min-width: 640px) 50vw, 100vw"
              className="object-contain"
            />
          ) : (
            <Package className="h-9 w-9 text-ink-muted" strokeWidth={1.5} aria-hidden="true" />
          )}
        </div>
        <div className="p-5">
          <h2 className="line-clamp-2 text-xl group-hover:underline">{name}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <ProductRatingSummary rating={rating} locale={locale} />
            {likeCount !== undefined && (
              <span className="text-ink-muted">
                {t(likeCount === 1 ? "{n} like" : "{n} likes", locale).replace("{n}", likeCount.toLocaleString(locale))}
              </span>
            )}
            {mobileOnly && <CardChip>{t("Mobile only", locale)}</CardChip>}
            {curated && <CardChip>{CURATED_PRODUCT_LABEL}</CardChip>}
          </div>
        </div>
      </Link>
      {actions && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line px-4 py-2">{actions}</div>}
    </Card>
  );
}
