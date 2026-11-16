// A product's <head>: its title, description, canonical address and social
// card. One builder for the two routes that can be asked for a product:
//
//   · /products/<id>   the product's page (./[id]/page.tsx)
//   · /p/<id>          its OLD address (app/(marketing)/p/[id]/page.tsx), which
//                      redirects here — but that page streams (it has a
//                      loading.tsx), so Next answers 200 and redirects with a
//                      meta tag in the browser (node_modules/next/dist/docs:
//                      permanentRedirect, "streaming context"). A link-preview
//                      fetcher re-scraping a link shared before the move reads
//                      THAT response's tags and does not follow the meta tag,
//                      so it gets the same card here, pointing at the new
//                      address, instead of the site's generic one.
//
// Only call it with a row the public gate let through (lib/public-post.ts
// getPublicPost): a hidden product, or one by a moderated author, emits no
// card at all.

import type { Metadata } from "next";
import { postImages, productPath } from "@/lib/post-types";
import type { PublicPostRow } from "@/lib/public-post";
import { productName } from "./product-view";

export function productMetadata(
  post: Pick<
    PublicPostRow,
    "id" | "title" | "content" | "image_url" | "image_urls"
  >,
): Metadata {
  const title = productName(post, post.content.slice(0, 70));
  const description = post.content.slice(0, 160);
  const SITE_URL =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";
  // Always an image, so the card is rich: the first screenshot, or the
  // branded site image.
  const images = [postImages(post)[0] ?? `${SITE_URL}/og-image.png`];
  const path = productPath(post.id);
  return {
    // Bare title — the root layout's "%s · Cofoundee" template adds the suffix.
    title,
    description,
    // The bare address, whatever deck context the request carries: those
    // variants are one page.
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${SITE_URL}${path}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}
