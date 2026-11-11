// / — the front door. A logged-out visitor gets the maker shelf once it has
// enough on it, and the pitch landing until then. Signed-in visitors never
// render this: proxy.ts sends them to their own home.
//
// Which arm is a per-request read, so it cannot be a build-time or static
// decision, and the third real product flips it with no deploy. See
// FRONT_DOOR_MIN_PRODUCTS in ../products/shelf-data.ts for the threshold and
// why there is a fallback at all.

import type { Metadata, ResolvingMetadata } from "next";
import { ProductShelf } from "../products/ProductShelf";
import { frontDoorServesShelf, shelfMetadata } from "../products/shelf-data";
import { PitchLanding } from "./PitchLanding";

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
  // The pitch arm adds NOTHING, including no title: a child title picks up the
  // root layout's "%s · Cofoundee" template, which the pitch has never had.
  if (!(await frontDoorServesShelf())) return {};
  return shelfMetadata("/", parent);
}

export default async function FrontDoorPage({ searchParams }: Props) {
  if (await frontDoorServesShelf()) {
    return <ProductShelf searchParams={searchParams} route="/" />;
  }
  return <PitchLanding />;
}
