// / — the front door: the maker shelf, for a logged-out visitor. Signed-in
// visitors never render this: proxy.ts sends them to their own home.
//
// It used to serve a pitch landing until the shelf had three products. The
// founder retired that page for good on 2026-11-18, so / is the shelf whatever
// is on it, an empty one included (./ProductShelf.tsx has those states), and
// /products canonicalises here.

import type { Metadata, ResolvingMetadata } from "next";
import { ProductShelf } from "../products/ProductShelf";
import { shelfMetadata } from "../products/shelf-data";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    category?: string | string[];
    after?: string | string[];
    product?: string | string[];
  }>;
};

export async function generateMetadata(
  _props: Props,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  return shelfMetadata("/", parent);
}

export default function FrontDoorPage({ searchParams }: Props) {
  return <ProductShelf searchParams={searchParams} route="/" />;
}
