// /products — the maker shelf as its own URL. The shelf itself, and the reasons
// it is built the way it is, are in ./ProductShelf.tsx; / renders the same
// component once the shelf can carry the front door.

import type { Metadata, ResolvingMetadata } from "next";
import { ProductShelf } from "./ProductShelf";
import { frontDoorServesShelf, shelfMetadata } from "./shelf-data";

// Per-request, and it would be even without this line: getLocale() reads
// cookies(), which opts the route out of static rendering on its own. Kept
// explicit so nobody "optimises" it by deleting the line and assumes the page
// became static.
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    category?: string | string[];
    after?: string | string[];
  }>;
};

export async function generateMetadata(
  _props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return shelfMetadata(
    (await frontDoorServesShelf()) ? "/" : "/products",
    parent,
  );
}

export default function ProductsPage({ searchParams }: Props) {
  return <ProductShelf searchParams={searchParams} route="/products" />;
}
