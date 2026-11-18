// /products/<id> — a product's page, for every reader.
//
// ── A PRODUCT IS NOT A POST ───────────────────────────────────────────────
// A product is stored as a forum_posts row (kind 'show_and_tell'), which is
// why its page used to be a post's: /p/<id> for a visitor and /community/<id>
// for a member, under the Community item of the rail, with an address a
// visitor could not open and an onboarding wall for a founder who had not
// finished it. It is one page now, at a product's own address, for anyone:
//   signed out   the product, its rating, the first comments and the ways in
//                (sign in to rate, to comment, to see the rest).
//   signed in    the same product with the member's own stars, the like, the
//                whole thread and the composer, a Share button, and — for its
//                maker — Edit.
// /p/<id> and /community/<id> both send a product here, deck context kept, so
// every link already out there still lands.
//
// A (MARKETING) ROUTE ON PURPOSE. Signed in, app/(marketing)/layout.tsx draws
// the same app shell as every app route but runs none of the (app) layout's
// gates — the deck (/products) is the same, and a product's page is a page of
// the deck. So a founder who has not finished onboarding can read it, as they
// can the deck and its review modal, and an investor can too. The rail marks
// Products: /products/<id> is under /products (components/SidebarNav.tsx).
// What a role may DO here is decided per control below (canComment, canRate),
// and again inside each action.
//
// ── WHAT THE PAGE IS, IN ORDER ────────────────────────────────────────────
// ../ProductDetail.tsx draws the product — the way back to the deck, the
// gallery, the name and description, "Try it", the rating — and this page adds
// who made it, the like / share / edit row, and the comments under the card.
// The deck sends its place along (`?from=products&category=game`), which only
// ever feeds deckReturnHref() and the sign-in links, re-parsed, never echoed
// (../deck-position.ts). The canonical address is the bare /products/<id>.
//
// ── THE TWO GATES ─────────────────────────────────────────────────────────
// Signed out: lib/public-post.ts getPublicPost(), the single gated read behind
// this page AND generateMetadata (it says what it filters and why). Signed in:
// the member's own client, where forum_posts' SELECT policy is `using (true)`,
// so the gate is written here — a hidden product, or one by a suspended member
// or a seeded bot, is a 404 for everyone except its maker and an admin, the two
// readers with a reason to see it, and a blocked pair cannot open each other's.
// In DEVELOPMENT ONLY a product by one of the suspended test accounts still
// renders in both (lib/test-accounts.ts).
//
// ── `?added=1` and `?saved=1` ─────────────────────────────────────────────
// createProductAction lands the maker here after adding a product, and
// updateProductAction after editing one (lib/post-actions.ts). Shown to the
// MAKER only: a short confirmation — for a new one, that it is on the shelf
// and was not announced.
//
// ── DEV FIXTURES HAVE A PAGE TOO, IN DEVELOPMENT ONLY ─────────────────────
// The deck's sample products (../fixtures.ts) have no row. In development a
// `fixture-…` id renders that sample from the module, with nothing on it that
// can be saved: a visitor's buttons all open the join dialog, and a member
// gets no stars and no like row. In a production build findFixture() returns
// null before it looks, so this branch cannot be reached.

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { isAdminUser } from "@/lib/admin";
import { getUser } from "@/lib/auth";
import { viewerKind } from "@/lib/device";
import { tServer } from "@/lib/i18n-server";
import { getPublicPost, PRODUCT_KIND } from "@/lib/public-post";
import { isPhoneOnly } from "../product-view";
import { findFixture } from "../fixtures";
import { productMetadata } from "../product-metadata";
import { ProductPageBody, type ProductSearch } from "./ProductPageBody";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<ProductSearch>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  // A development sample: a title for the tab, and never indexed. Null in a
  // production build, like the page branch it names.
  const fixture = findFixture(id);
  if (fixture) {
    return {
      title: fixture.title ?? "Product",
      robots: { index: false, follow: false },
    };
  }

  // The SAME gate as the signed-out page body. A hidden product, or one by a
  // suspended or bot author, emits no social card at all — the maker and an
  // admin, who can still open it, get a plain title.
  const found = await getPublicPost(id);
  if (!found || found.post.kind !== PRODUCT_KIND) {
    return { title: await tServer("Product") };
  }
  // A computer does not see a phone-only product (see the page below), so
  // it does not get its name in the tab either — unless the page opens for
  // this reader after all: its maker, or an admin. Bots still get the card.
  if (
    isPhoneOnly(found.post.link_url, found.post.platforms) &&
    (await viewerKind()) === "computer" &&
    !(await opensPhoneOnlyAnyway(found.post.author_id))
  ) {
    return { title: await tServer("Product") };
  }
  // Title, description, canonical and social card: ../product-metadata.ts,
  // shared with the old /p/<id> address.
  return productMetadata(found.post);
}

/** Whether the signed-in reader is the maker or an admin: the two a
 *  phone-only product's page still opens for on a computer (MemberProduct). */
async function opensPhoneOnlyAnyway(authorId: string): Promise<boolean> {
  const user = await getUser();
  if (!user) return false;
  if (user.id === authorId) return true;
  return isAdminUser(await createClient(), user);
}

export default async function ProductPage({ params, searchParams }: Props) {
  const { id } = await params;
  return <ProductPageBody id={id} search={await searchParams} />;
}
