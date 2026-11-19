import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Heart } from "lucide-react";
import { ProductGridCard } from "@/components/ProductGridCard";
import { EmptyState, LinkButton, Section } from "@/components/ui";
import {
  isPhoneOnly,
  productImages,
  productName,
} from "@/app/(marketing)/products/product-view";
import { requireUser } from "@/lib/auth";
import { getBlockedIds } from "@/lib/blocking";
import { t } from "@/lib/i18n";
import { getLocale, tServer } from "@/lib/i18n-server";
import { productPath } from "@/lib/post-types";
import { getLikedProductsPage } from "@/lib/posts";
import { LIKED_PRODUCTS_PATH } from "@/lib/roles";

const PAGE_SIZE = 24;

function pageHref(page: number) {
  return page === 1 ? LIKED_PRODUCTS_PATH : `${LIKED_PRODUCTS_PATH}?page=${page}`;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: await tServer("Liked products"),
    robots: { index: false, follow: false },
  };
}

export default async function LikedProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string | string[] }>;
}) {
  const user = await requireUser();
  const [{ page: rawPage }, blocked, locale] = await Promise.all([
    searchParams,
    getBlockedIds(user.id),
    getLocale(),
  ]);
  const requested = typeof rawPage === "string" ? Number(rawPage) : 1;
  const page =
    Number.isSafeInteger(requested) && requested > 0 &&
    requested <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE)
      ? requested
      : 1;
  const liked = await getLikedProductsPage(user.id, blocked, (page - 1) * PAGE_SIZE, PAGE_SIZE);
  const lastPage = Math.max(1, Math.ceil((liked?.count ?? 0) / PAGE_SIZE));
  if (liked && page > lastPage) redirect(pageHref(lastPage));

  const tr = (message: string) => t(message, locale);
  return (
    <Section>
      <h1 className="text-d2 mb-8">{tr("Liked products")}</h1>

      {!liked ? (
        <EmptyState
          title={tr("Couldn’t load liked products")}
          description={tr("Refresh the page to try again.")}
        />
      ) : liked.products.length === 0 ? (
        <EmptyState
          icon={Heart}
          title={tr("No liked products yet")}
          description={tr("Tap the heart on a product to find it here later.")}
          action={<LinkButton href="/products">{tr("All products")}</LinkButton>}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {liked.products.map((product) => {
            const cover = productImages(product)[0];
            const name = productName(product, tr("Product"));
            return (
              <li key={product.id}>
                <ProductGridCard
                  href={productPath(product.id)}
                  name={name}
                  cover={cover}
                  rating={product.rating}
                  mobileOnly={isPhoneOnly(product.link_url, product.platforms)}
                  locale={locale}
                />
              </li>
            );
          })}
        </ul>
      )}

      {lastPage > 1 && (
        <nav aria-label={tr("Liked product pages")} className="mt-8 flex justify-center gap-3">
          {page > 1 && (
            <LinkButton href={pageHref(page - 1)} variant="secondary" size="sm">
              {tr("Previous")}
            </LinkButton>
          )}
          {page < lastPage && (
            <LinkButton href={pageHref(page + 1)} variant="secondary" size="sm">
              {tr("Next")}
            </LinkButton>
          )}
        </nav>
      )}
    </Section>
  );
}
