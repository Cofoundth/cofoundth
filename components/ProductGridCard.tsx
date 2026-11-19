import Image from "next/image";
import Link from "next/link";
import type { MouseEventHandler } from "react";
import { Package } from "lucide-react";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import { Card, CardChip } from "@/components/ui";
import { t, type Locale } from "@/lib/i18n";
import type { ProductRating } from "@/lib/post-types";

export function ProductGridCard({
  href,
  name,
  cover,
  rating,
  mobileOnly,
  locale,
  onClick,
}: {
  href: string;
  name: string;
  cover?: string;
  rating: ProductRating;
  mobileOnly: boolean;
  locale: Locale;
  onClick?: MouseEventHandler<HTMLAnchorElement>;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      onClick={onClick}
      aria-haspopup={onClick ? "dialog" : undefined}
      className="group block h-full rounded-3xl"
    >
      <Card padding="none" className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
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
            {mobileOnly && <CardChip>{t("Mobile only", locale)}</CardChip>}
          </div>
        </div>
      </Card>
    </Link>
  );
}
