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
// `?category=game` is read HERE, on the server, so the first paint is already
// the filtered grid and /products?category=game is a shareable link. See the
// header of ProductFilters.tsx for why that mattered enough to rule out state.

import { PackageOpen, Rocket, SearchX } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getLocale, tServer } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { getBlockedIds } from "@/lib/blocking";
import { EmptyState, LinkButton, Section } from "@/components/ui";
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
  type ProductCounts,
} from "@/lib/post-types";
import { getProductsPage } from "@/lib/posts";
import { CATEGORY_LABEL, productBucketOf } from "./categories";
import { productFixtures } from "./fixtures";
import { ProductFilters } from "./ProductFilters";
import { ProductCard } from "./ProductCard";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  // Next 16: searchParams is a Promise.
  const { category: raw } = await searchParams;

  // An unknown ?category= is treated as no filter rather than as an error. The
  // value is in a URL anyone can edit or mistype, and a 404 for a typo on a
  // browse page would be theatre.
  const selected: ProductCategory | null = (
    PRODUCT_CATEGORIES as readonly string[]
  ).includes(raw ?? "")
    ? (raw as ProductCategory)
    : null;

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

  // One wait for both: the grid is the selected category, the counts are every
  // category (the chips need all six regardless of which one is on).
  const { items: real, counts: realCounts } = await getProductsPage(supabase, {
    category: selected,
    userId: user.id,
    excludeAuthorIds: blocked,
  });

  // DEV ONLY — productFixtures() returns [] in a production build, so this
  // whole block collapses to `shown = real` there. See ./fixtures.ts for why
  // the samples are a module rather than rows with a `test` column.
  //
  // They are merged AFTER the query, which means they obey the category filter
  // and the chip tallies here instead of inside Postgres. A fixture that did
  // not count toward its own chip would make the page lie about itself twice:
  // the chip would read 0 next to a visible card, and "{n} products" would
  // disagree with what is on screen.
  const fixtures = productFixtures();
  const fixturesHere = selected
    ? fixtures.filter((f) => productBucketOf(f.tags) === selected)
    : fixtures;

  const shown = [...real, ...fixturesHere];
  const counts: ProductCounts = { ...realCounts };
  for (const f of fixtures) {
    counts[productBucketOf(f.tags)] += 1;
    counts.all += 1;
  }

  const [
    tTitle,
    tIntro,
    tOne,
    tMany,
    tAddYours,
    tEmptyTitle,
    tEmptyBody,
    tEmptyCta,
    tNoneHereTitle,
    tNoneHereBody,
    tSeeEverything,
    tCta,
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
    tServer("Try it"),
    tServer("Try {name} on {host}"),
    tServer("No link yet"),
    tServer("A founder"),
  ]);

  // The tally beside the title counts what is ON SCREEN, not the shelf: with a
  // category selected the two differ, and the number next to a filtered grid
  // has to be the grid's.
  const n = shown.length;
  const countLabel = (n === 1 ? tOne : tMany).replace("{n}", String(n));

  // `t(…, locale)` rather than six more awaited `tServer()` calls: tServer IS
  // this plus a cached getLocale(), and the locale is already in hand. The
  // CATEGORY_LABEL values are the English source strings, i.e. the dictionary
  // keys (lib/i18n.ts), so they must not reach the DOM untranslated.
  const categoryLabel = (c: ProductCategory) => t(CATEGORY_LABEL[c], locale);

  const cardLabels = {
    cta: tCta,
    ctaAria: tCtaAria,
    noLink: tNoLink,
    anonymous: tAnonymous,
  };

  return (
    <Section>
      {/* PAGE HEADER — text-d2 flat. No `lg:text-d3`: that ladder jump is for
          marketing pages, and it is what used to make app surfaces read as
          landing pages. */}
      <div className="mb-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-[640px]">
            <h1 className="text-d2 flex flex-wrap items-baseline gap-2.5">
              <span>{tTitle}</span>
              <span className="text-sm font-normal tracking-normal text-ink-muted">
                {countLabel}
              </span>
            </h1>
            <p className="mt-2 leading-relaxed text-ink-muted">{tIntro}</p>
          </div>
          {/* Supply side. The shelf is only worth visiting if makers keep
              adding to it, and the composer is on /community — there is no
              second place to post from, by design. */}
          <LinkButton href="/community" variant="secondary" size="sm">
            <Rocket className="h-4 w-4" strokeWidth={1.5} />
            {tAddYours}
          </LinkButton>
        </div>
      </div>

      <ProductFilters selected={selected} counts={counts} />

      {shown.length === 0 ? (
        // TWO DIFFERENT MESSAGES, because they ask for two different things.
        // `counts.all` is what separates them: an empty shelf needs a maker, an
        // empty category needs the reader to look elsewhere. Showing "try
        // another category" on a shelf that has nothing at all would send
        // someone hunting through six empty chips.
        counts.all === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={tEmptyTitle}
            description={tEmptyBody}
            action={
              <LinkButton href="/community" size="sm">
                {tEmptyCta}
              </LinkButton>
            }
          />
        ) : (
          <EmptyState
            icon={SearchX}
            title={tNoneHereTitle}
            description={tNoneHereBody}
            action={
              <div className="flex flex-wrap items-center justify-center gap-2">
                <LinkButton href="/products" size="sm" variant="secondary">
                  {tSeeEverything}
                </LinkButton>
                <LinkButton href="/community" size="sm">
                  {tEmptyCta}
                </LinkButton>
              </div>
            }
          />
        )
      ) : (
        // `xl:grid-cols-3`, not lg. The sidebar costs 256px, so at lg a 3-up
        // app grid gives 219px columns — NARROWER than the 2-up at the same
        // viewport.
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {shown.map((p) => (
            <ProductCard
              key={p.id}
              post={p}
              locale={locale}
              labels={{
                ...cardLabels,
                // productBucketOf, never productCategoryOf: an older
                // show_and_tell has no category tag, and a null must never
                // reach a label lookup.
                category: categoryLabel(productBucketOf(p.tags)),
              }}
            />
          ))}
        </div>
      )}
    </Section>
  );
}
