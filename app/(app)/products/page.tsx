// /products — the maker shelf.
//
// ── WHAT THIS SURFACE IS ──────────────────────────────────────────────────
// A level BELOW "startup": people here are making an app, a game, a tool, and
// they want someone to try it. The page's only job is to send a reader OUT to
// the real thing — App Store, Play Store, a web app.
//
// SCOPE IS DELIBERATELY SMALL, and that is a product decision, not an
// unfinished one. We link out. We do not host, embed, proxy or run anybody's
// product, and there are no ratings, install counts or click analytics. If a
// product is bad and the visitor bounces, that is the maker's signal to act on,
// not a number for us to publish.
//
// ── NO NEW TABLE ──────────────────────────────────────────────────────────
// A product IS a `forum_posts` row with `kind = 'show_and_tell'`; the category
// rides in the `tags` text[]. The reasoning lives in lib/post-types.ts next to
// PRODUCT_CATEGORIES, where the next person to touch it will actually read it.
//
// ── THE CATEGORY IS IN THE URL ────────────────────────────────────────────
// `?category=game,app` is read HERE, on the server, so the first paint of a
// shared link is already the filtered grid. It is the only thing the server
// does with the filter: the chips themselves are client-side (one Set, no
// round trip) and mirror the Set back into the address with `replaceState`.
// The reasoning, the OR semantics and the scale at which this stops being the
// right design all live in ./filter-context.tsx.

import { Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getAccountRole } from "@/lib/account";
import { getLocale, tServer } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { getBlockedIds } from "@/lib/blocking";
import { LinkButton, Section } from "@/components/ui";
import { type ProductCategory } from "@/lib/post-types";
import { getProductsPage } from "@/lib/posts";
import { CATEGORY_LABEL, productBucketOf } from "./categories";
import { productFixtures } from "./fixtures";
import { ProductFilters } from "./ProductFilters";
import { ProductGrid } from "./ProductGrid";
import { ProductCard } from "./ProductCard";
import { ProductCount, ProductFilterProvider } from "./filter-context";
import { SwitchToBuilding } from "./SwitchToBuilding";
// parseCategoryParam lives in ./categories (no "use client"): the SERVER
// renders the first, already-filtered paint, so it must read the URL with
// the same function the client does — and a server file cannot import from
// a client module.
import { parseCategoryParam } from "./categories";

export const dynamic = "force-dynamic";

/**
 * How much of the shelf one request fetches, and therefore how much the
 * client-side filter can see.
 *
 * 200, not the query's default 30, because the chips now tally what was
 * FETCHED — anything the server did not send is invisible to every filter and
 * to every count. The full argument, including the point at which this design
 * has to be replaced rather than tuned, is in ./filter-context.tsx. In short:
 * exact while the shelf is <= 200 products; today it holds zero real ones.
 */
const PRODUCT_SHELF_LIMIT = 200;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string | string[] }>;
}) {
  // Next 16: searchParams is a Promise.
  const { category: raw } = await searchParams;

  // Unknown or malformed slugs are DROPPED, not treated as a filter matching
  // nothing — the value is in a URL anyone can edit or mistype, and answering
  // a typo with an empty grid would be theatre. One parser, shared with the
  // client, so the server's first paint and the client's state cannot read the
  // same URL differently.
  const initialCategories = parseCategoryParam(raw);

  const user = await requireUser();
  const supabase = await createClient();
  const locale = await getLocale();

  // Blocked pairs disappear from each other everywhere, and the feed already
  // honours this (see /community). A blocked member's product leading this
  // grid would be the block half-working, which is worse than not shipping it.
  // `excludeAuthorIds` is the query's own hook for it, so the exclusion is
  // applied to the chip tallies as well as to the cards — a chip reading "3"
  // that shows two products is the kind of small lie that costs trust.
  const blocked = await getBlockedIds(user.id);

  // WHO IS LOOKING AT THE SHELF, because the supply-side CTA below is a
  // different control for an explorer. /products is EXPLORER_HOME, so this is
  // not an edge case — it is the role this page was added for. (An investor
  // cannot read this route at all; the gate bounces them to /funding, so the
  // only two roles that reach here are founder and explorer.)
  const role = await getAccountRole(supabase, user.id);

  // NO `category` — the whole shelf, filtered in the browser. The `counts` the
  // query also returns are deliberately IGNORED: they are tallied over a
  // separate 1000-row scan, so past the fetch limit they would describe rows
  // the client does not have and a chip would promise cards it cannot show.
  // The tallies are recomputed below from exactly what is on this page.
  //
  // ⚠️ That makes TWO things in lib/posts.ts dead weight for this page: the
  // `category` parameter (no other caller) and the count query it still runs
  // on every load. Both should go; neither is touched here because lib/ is
  // owned by another change in flight. The knowledge inside the `category`
  // branch — what "other" means, and why it was a negation rather than a tag
  // match — is preserved in ./filter-context.tsx so deleting it loses nothing.
  const { items: real } = await getProductsPage(supabase, {
    userId: user.id,
    excludeAuthorIds: blocked,
    limit: PRODUCT_SHELF_LIMIT,
  });

  // DEV ONLY — productFixtures() returns [] in a production build, so this
  // whole block collapses to `shown = real` there. See ./fixtures.ts for why
  // the samples are a module rather than rows with a `test` column.
  //
  // They are merged AFTER the query, so they go through the same client-side
  // bucketing as a real row and land in the chips and the count like one. A
  // fixture that did not count toward its own chip would make the page lie
  // about itself twice: the chip would read 0 next to a visible card, and "{n}
  // products" would disagree with what is on screen.
  const shown = [...real, ...productFixtures()];

  const [
    tTitle,
    tIntro,
    tOne,
    tMany,
    tAddYours,
    tSwitchToBuilding,
    tStartBuilding,
    tEmptyTitle,
    tEmptyBody,
    tEmptyCta,
    tNoneHereTitle,
    tNoneHereBody,
    tSeeEverything,
    tCtaAria,
    tNoLink,
    tAnonymous,
  ] = await Promise.all([
    tServer("Try what the community built"),
    tServer(
      "Apps, games and tools made by founders here. Every card takes you straight to the real thing.",
    ),
    tServer("{n} product"),
    tServer("{n} products"),
    tServer("Add yours"),
    tServer("Switch to building"),
    tServer("Start building"),
    tServer("Nothing on the shelf yet"),
    tServer(
      "Built something? Post it in the community as a Show & tell, drop the link in, and it lands here.",
    ),
    tServer("Post in the community"),
    // NOT the existing "Nothing here yet" key — its Thai value is
    // "ยังไม่มีโพสต์" ("no posts yet"), which is the community feed's wording
    // and wrong for a category of products. A shared key is only a saving when
    // both sides mean the same thing.
    tServer("Nothing in this category yet"),
    tServer("Try another category — or be the first to put something here."),
    tServer("See everything"),
    tServer("Try {name} on {host}"),
    tServer("No link yet"),
    tServer("A founder"),
  ]);

  // `t(…, locale)` rather than six more awaited `tServer()` calls: tServer IS
  // this plus a cached getLocale(), and the locale is already in hand. The
  // CATEGORY_LABEL values are the English source strings, i.e. the dictionary
  // keys (lib/i18n.ts), so they must not reach the DOM untranslated.
  const categoryLabel = (c: ProductCategory) => t(CATEGORY_LABEL[c], locale);

  // THE SUPPLY SIDE, per role. A founder gets the link to the composer; an
  // EXPLORER gets the one control that promotes them to a founder, because
  // /community has no composer for them and createPostAction refuses the
  // submit — see ./SwitchToBuilding.tsx for why a link into a refusal is worse
  // than no link. Two instances because the header and the empty state are
  // different buttons (secondary beside the title, primary inside the empty
  // state); each form owns its own pending/error state, which is correct — a
  // failure belongs next to the button that was pressed.
  const headerCta =
    role === "explorer" ? (
      <SwitchToBuilding label={tSwitchToBuilding} variant="secondary" />
    ) : (
      <LinkButton href="/community" variant="secondary" size="sm">
        <Rocket className="h-4 w-4" strokeWidth={1.5} />
        {tAddYours}
      </LinkButton>
    );
  const emptyStateCta =
    role === "explorer" ? (
      <SwitchToBuilding label={tStartBuilding} variant="primary" />
    ) : (
      <LinkButton href="/community" size="sm">
        {tEmptyCta}
      </LinkButton>
    );

  const cardLabels = {
    // No `cta`: the per-card "Try it" button is gone and the whole card is the
    // link now, so "Try {name} on {host}" is the card link's accessible name
    // rather than a button's. See ./ProductCard.tsx.
    ctaAria: tCtaAria,
    noLink: tNoLink,
    anonymous: tAnonymous,
  };

  // ONE array, read by three client components: the provider tallies the
  // chips off it, the grid filters it, and the header count comes from the
  // provider. Built here so the CARD stays server markup — `card` is a
  // rendered <ProductCard>, passed down as a prop, which is what keeps the
  // shelf from becoming a client tree (see ProductCard's header).
  //
  // `productBucketOf`, never `productCategoryOf`: an older show_and_tell has
  // no category tag, and a null must never reach a label lookup or a chip.
  const shelf = shown.map((p) => {
    const bucket = productBucketOf(p.tags);
    return {
      id: p.id,
      bucket,
      card: (
        <ProductCard
          key={p.id}
          post={p}
          locale={locale}
          labels={{ ...cardLabels, category: categoryLabel(bucket) }}
        />
      ),
    };
  });

  return (
    <Section>
      {/* The provider wraps the HEADER as well as the chips and the grid,
          because the "{n} products" tally inside the <h1> has to track the
          filter too. Everything inside stays server-rendered except the three
          client islands that read the Set. */}
      <ProductFilterProvider items={shelf} initial={initialCategories}>
      {/* PAGE HEADER — text-d2 flat. No `lg:text-d3`: that ladder jump is for
          marketing pages, and it is what used to make app surfaces read as
          landing pages. */}
      <div className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[640px]">
            <h1 className="text-d2 flex flex-wrap items-baseline gap-2.5">
              <span>{tTitle}</span>
              <ProductCount one={tOne} many={tMany} />
            </h1>
            <p className="mt-2 leading-relaxed text-ink-muted">{tIntro}</p>
          </div>
          {/* Supply side. The shelf is only worth visiting if makers keep
              adding to it, and the composer is on /community — there is no
              second place to post from, by design.

              There is no pause control beside it: the cards' screenshots only
              move while a pointer is inside one, and WCAG 2.2.2 asks for a
              mechanism for content that moves AUTOMATICALLY. Hover-driven
              motion stops when you stop hovering, which is the mechanism. */}
          {headerCta}
        </div>
      </div>

      <ProductFilters />

      <ProductGrid
        items={shelf}
        labels={{
          emptyTitle: tEmptyTitle,
          emptyBody: tEmptyBody,
          noneHereTitle: tNoneHereTitle,
          noneHereBody: tNoneHereBody,
          seeEverything: tSeeEverything,
        }}
        supplyCta={emptyStateCta}
      />
      </ProductFilterProvider>
    </Section>
  );
}
