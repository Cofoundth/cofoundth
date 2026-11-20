// The maker shelf, rendered at / (the front door) and at /products.
//
// ── WHAT THIS SURFACE IS ──────────────────────────────────────────────────
// A level BELOW "startup": people here are making an app, a game, a tool, and
// they want someone to try it. The page's job is to get a reader OUT to the
// real thing — App Store, Play Store, a web app — straight from the card, in a
// new tab, and back here to rate it and say what they thought.
//
// ── WHY IT IS PUBLIC, AND WHAT THAT BUYS ──────────────────────────────────────
// Individual products were ALWAYS public: app/(marketing)/p/[id] renders any
// forum_posts row to an anonymous visitor, with OG metadata and a share
// button. Only the SHELF listing them was behind auth, so a maker could share
// their product link and anyone saw it — while cofoundee.co/products demanded
// a signup. That is incoherent, and an auth-walled page is invisible to Google
// on the surface whose whole job is distribution.
//
//   anonymous  ->  browse the shelf, open a product, try it   (acquisition)
//                     | wants to rate it or say something
//   explorer   ->  comment, like, RSVP, come back             (retention)
//
// Signing up stops being the price of admission and becomes what you do once
// you already care. The EXPLORER role is not made redundant by this — it
// becomes what the public page converts into.
//
// ── NO GATES RUN HERE ANY MORE, INCLUDING TWO THAT USED TO ────────────────────
// app/(marketing)/layout.tsx renders the full AppShell for a signed-in visitor
// and MarketingNav/Footer for a logged-out one, and deliberately carries none
// of app/(app)/layout.tsx's gates. Two consequences were DECIDED, not
// discovered:
//
//   * A FOUNDER WHO HAS NOT FINISHED ONBOARDING now reads the shelf instead
//     of being redirected to /onboarding. Allowed, on purpose: the shelf is
//     the public acquisition surface, and bouncing somebody off the one page
//     the whole internet can read, into a wizard, is the same incoherence
//     this change is fixing. They still meet /onboarding on every real app
//     route. If that is ever reversed it has to become a check INSIDE this
//     page — the marketing layout must not grow gates.
//   * AN INVESTOR now reads it too (previously bounced to /funding).
//     /products left isAppShellRoute, so proxy.ts short-circuits before the
//     role lookup. Products is in their rail for that reason — see
//     components/AppSidebar.tsx.
//
// There is also no IncompleteProfileBanner on this route, which the marketing
// layout omits deliberately; its own header says why.
//
// SCOPE IS DELIBERATELY SMALL, and that is a product decision, not an
// unfinished one. The card links out. We do not host, embed, proxy or run
// anybody's product, and there are no install counts or click analytics.
//
// PRODUCTS HAVE STAR RATINGS — CLAUDE.md, Language Rules, "Founder decision
// (2026-11-10)". This page USED to say the opposite, at length, and the founder
// overrode it; the decision is the source of truth, not the old argument. What
// was decided, and therefore what this shelf may and may not do with a rating:
//   * 1–5 stars, given DELIBERATELY by a signed-in member, on the product's
//     own page (/community/<id>) or in the deck's review modal after trying
//     it — never by the swipe itself. One per member per product, changeable,
//     never on your own product. Table + RLS: migration 0079_product_ratings.sql.
//   * a member's own score is PRIVATE. Only the average and the count are
//     public, and the count always shows beside the average.
//   * products only — never a person, a founder or a company.
// Every row getShelfProducts() returns carries `rating: { average, count }`,
// the PUBLIC aggregate, identical for every audience. The ONE private number
// on this page is the signed-in reader's own score, read through their own
// session (getMyProductRatings, RLS select_own) and sent only to them, to
// prefill the review modal's stars. If either read fails, products arrive
// UNRATED / with no stars and the shelf still renders (lib/product-ratings.ts).
// COMMENTS remain the place to say WHY, and they still require a login, which
// is the conversion this page is built on.
//
// The product deck skips left and tries the product on a right swipe.
// A member's right swipe also saves a like. Ratings and comments are
// deliberate feedback on the product page or in the member's review dialog.
// A first right-swipe try offers guests an optional sign-in invite on return.
//
// ── NO NEW TABLE ──────────────────────────────────────────────────────────
// A product IS a `forum_posts` row with `kind = 'show_and_tell'`; the category
// rides in the `tags` text[]. The reasoning lives in lib/post-types.ts next to
// PRODUCT_CATEGORIES, where the next person to touch it will actually read it.
//
// ── THE CATEGORY IS IN THE URL ────────────────────────────────────────────
// `?category=game` is read HERE, on the server, so the first paint of a shared
// link is already the filtered deck. It is the only thing the server does with
// the filter: the chip row itself (./ProductFilters.tsx) is client-side (one
// value, no round trip) and mirrors the choice back into the address with
// `replaceState`. The reasoning, the single-select rule and the scale at which
// this stops being the right design all live in ./filter-context.tsx.
//
// ── NO VISIBLE PAGE HEADER ────────────────────────────────────────────────
// The deck IS the page, so nothing sits above it but its top line — the
// category filter between the corners (see ONE SCREEN below): no visible
// title, no product count, no intro paragraph. They cost a phone the
// height the deck's buttons needed, and the cards say what the page is better
// than a sentence about cards does. The title is still there for the readers
// that need one — screen readers and crawlers — as the page's single <h1>,
// visually hidden.
//
// ── ONE SCREEN, NO SITE HEADER OR FOOTER ──────────────────────────────────
// The deck marks itself [data-deck-page], which stops the
// logged-out header and footer being drawn (app/globals.css). What a visitor
// needed from that header comes with the page instead, in its top line: the
// mark, the language and "Sign in" — without it, a member whose session has
// lapsed has no way in from the front door. A signed-in reader keeps the app
// shell. The view switch lives in the shelf controls for both audiences.

import Link from "next/link";
import { Package, PackageOpen, Rocket } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import { getAccountRole } from "@/lib/account";
import { getMyProductRatings } from "@/lib/product-ratings";
import { productStoreLinksOf } from "@/lib/product-store-links";
import { platformLabelsOf } from "@/lib/post-types";
import {
  ADD_PRODUCT_PATH,
  MY_PRODUCTS_PATH,
  canComment,
  canRate,
} from "@/lib/roles";
import { authHref } from "@/lib/auth-href";
import { t } from "@/lib/i18n";
import { getLocale, tServer } from "@/lib/i18n-server";
import { LEGAL_LINKS } from "@/lib/sidebar";
import {
  EmptyState,
  LinkButton,
  Section,
  buttonClasses,
} from "@/components/ui";
import { BrandMark } from "@/components/Brand";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { AuthReturnLink } from "@/components/marketing/AuthReturnLink";
import { productBucketOf } from "./categories";
import { getShelfProducts } from "./shelf-data";
import { ProductFilters } from "./ProductFilters";
import {
  cardFooterLabel,
  displayHost,
  productImages,
  phoneOnly,
  phonePlatformsOf,
  productName,
} from "./product-view";
import {
  parseAfterParam,
  parseProductParam,
  parseProductView,
  type DeckRoute,
} from "./deck-position";
import { ProductPageBody } from "./[id]/ProductPageBody";
import { ProductDeck, type DeckProduct } from "./ProductDeck";
import { ProductFilterProvider } from "./filter-context";
import { ProductShelfFrame, ProductViewSwitch } from "./ProductShelfView";
import { isFixture } from "./fixtures";
import { SwitchToBuilding } from "./SwitchToBuilding";
// parseCategoryParam lives in ./categories (no "use client"): the SERVER
// renders the first, already-filtered paint, so it must read the URL with
// the same function the client does — and a server file cannot import from
// a client module.
import { parseCategoryParam } from "./categories";
import { viewerKind } from "@/lib/device";

export async function ProductShelf({
  searchParams,
  route,
}: {
  searchParams: Promise<{
    category?: string | string[];
    after?: string | string[];
    card?: string | string[];
    product?: string | string[];
    view?: string | string[];
    sort?: string | string[];
  }>;
  /** Which page is rendering the shelf, so a product's page can link back to
   *  the same deck. */
  route: DeckRoute;
}) {
  // Next 16: searchParams is a Promise.
  const { category: raw, after: rawAfter, card, product: rawProduct, view, sort } = await searchParams;

  // `?product=<id>`: the product whose own page is open in the modal over
  // the deck (./ProductModal.tsx). Shape-checked before it reaches a query.
  const modalId = parseProductParam(rawProduct);

  // `?after=<id>`: the last product the reader tried in a new tab, written
  // by the deck so that a reload, or coming back, resumes after it. Read here so that address paints the right card
  // first. (`?review=` is the deck's, read in the browser: ./DeckPrompts.tsx.)
  // See ./deck-position.ts.
  const resumeAfter = parseAfterParam(rawAfter);

  // Unknown or malformed slugs are DROPPED, not treated as a filter matching
  // nothing — the value is in a URL anyone can edit or mistype, and answering
  // a typo with an empty deck would be theatre. A legacy multi-category link
  // resolves to its first valid slug. One parser, shared with the client, so
  // the server's first paint and the client's state cannot read the same URL
  // differently.
  const initialCategory = parseCategoryParam(raw);

  // getUser(), NOT requireUser(). requireUser redirects to /login when there
  // is nobody, which is the auth wall this change exists to remove — an
  // anonymous visitor arriving from Google, from the sitemap or from a maker's
  // shared link was 307'd before a single product rendered. getUser returns
  // `User | null` and never redirects, so EVERYTHING below branches on
  // identity instead of assuming one.
  const user = await getUser();
  const supabase = await createClient();
  const locale = await getLocale();

  // WHO IS LOOKING AT THE SHELF, because the supply-side CTA below is a
  // different control for each audience. NEVER resolve a role for a missing
  // user: getAccountRole runs .maybeSingle() and parseAccountRole FAILS OPEN to
  // "founder" for a null row (lib/roles.ts explains why that direction is
  // right), so a nullish-id call would hand every anonymous visitor and every
  // crawler the FOUNDER branch — i.e. the "Add yours" link to /products/new,
  // an (app) route that 307s them straight to /login. `null` here means
  // "nobody is signed in" and is a distinct, explicit CTA state below, not a
  // fallthrough.
  const role = user ? await getAccountRole(supabase, user.id) : null;

  // One read per request, shared with generateMetadata: see ./shelf-data.ts,
  // which also holds the reasoning for how these rows are read and filtered.
  const shown = await getShelfProducts();

  // Whether this founder has put anything up yet, which turns the deck's "Add
  // yours" into "My products" (supplyCta below). A card of theirs on the shelf
  // answers it for free; otherwise one head-only count, because a product can
  // be theirs and NOT on the shelf (a moderator hid it), and My products still
  // lists it.
  const hasOwnProducts =
    role === "founder" &&
    !!user &&
    (shown.some((p) => p.isOwn) ||
      ((
        await supabase
          .from("forum_posts")
          .select("id", { count: "exact", head: true })
          .eq("author_id", user.id)
          .eq("kind", "show_and_tell")
      ).count ?? 0) > 0);

  // WHAT THE REVIEW MODAL MAY OFFER THIS READER (./DeckPrompts.tsx), decided
  // here, where the role is known, with the same predicates the product page
  // and setProductRatingAction use: a role that canRate, never your own
  // product. The shelf's rows are already non-hidden and blocked pairs are
  // already gone (./shelf-data.ts), which are the action's other refusals.
  // The action re-checks all of it; this only decides whether to ASK.
  const mayRate = role !== null && canRate(role);
  // The reader's own scores, to prefill the stars: real rows only (a fixture
  // id is not a uuid and would fail the whole read), and only for someone who
  // could be asked.
  const myScores =
    user && mayRate
      ? await getMyProductRatings(
          supabase,
          shown.filter((p) => !isFixture(p.id) && !p.isOwn && p.myLike).map((p) => p.id),
          user.id,
        )
      : new Map<string, number>();

  const [
    tTitle,
    tAddYours,
    tSwitchToBuilding,
    tStartBuilding,
    tJoinCofoundee,
    tEmptyTitle,
    tEmptyBody,
    tEmptyBodyAnon,
    tEmptyBodyExplorer,
    tEmptyCta,
    tNoneHereTitle,
    tNoneHereBody,
    tMobileOnly,
    tSeeEverything,
    tTryAria,
    tAnonymous,
    tDeckName,
    tSkip,
    tLike,
    tTryIt,
    tDeckPosition,
    tDeckEnd,
    tStartOver,
    tPreviousImage,
    tNextImage,
    tPreviousGroup,
    tNextGroup,
    tMoreAria,
    tClose,
    tProduct,
    tDiscard,
    tSignIn,
    tLegal,
    tMyProducts,
  ] = await Promise.all([
    tServer("Try what the community built"),
    tServer("Add yours"),
    tServer("Switch to building"),
    tServer("Start building"),
    tServer("Join Cofoundee"),
    tServer("Nothing on the shelf yet"),
    tServer(
      "Built something? Add it with a name, a link and a few screenshots, and it lands here.",
    ),
    // A SEPARATE empty body for an anonymous visitor: an empty shelf is what a
    // logged-out visitor gets at / and /products, and the member copy above
    // tells them to use a form they cannot reach yet.
    tServer(
      "Nobody has put anything on the shelf yet. Join the community and be the first — it is free.",
    ),
    // createProductAction's own refusal (lib/post-actions.ts), reused on
    // purpose: it is the same boundary, said to the same person.
    tServer(
      "The shelf is for members who build. Switch to building to post a product.",
    ),
    tServer("Add your product"),
    // NOT the existing "Nothing here yet" key — its Thai value is
    // "ยังไม่มีโพสต์" ("no posts yet"), which is the community feed's wording
    // and wrong for a category of products. A shared key is only a saving when
    // both sides mean the same thing.
    tServer("Nothing in this category yet"),
    tServer("Try another category — or be the first to put something here."),
    tServer("Mobile only"),
    tServer("See everything"),
    tServer("Try {name} on {host}"),
    tServer("A founder"),
    tServer("Products to try"),
    tServer("Skip"),
    tServer("Like"),
    tServer("Try"),
    tServer("{name}, {n} of {total}"),
    tServer("That's everything for now"),
    tServer("Start over"),
    tServer("Previous image"),
    tServer("Next image"),
    tServer("Previous screenshots"),
    tServer("Next screenshots"),
    tServer("More about {name}"),
    tServer("Close"),
    tServer("Product"),
    tServer("Discard the comment you were writing?"),
    tServer("Sign in"),
    tServer("Legal"),
    tServer("My products"),
  ]);
  // Exactly the legal trio the app shell shows (one definition, lib/sidebar.ts).
  // Not Contact: the privacy notice carries the contact channel PDPA asks for,
  // and a fourth link pushed the line onto two on a 390px phone.
  const legalTargets = await Promise.all(
    LEGAL_LINKS.map(async (l) => ({
      href: l.href,
      label: await tServer(l.label),
    })),
  );

  // THE SUPPLY SIDE, and the page is now read by FOUR audiences, so this is a
  // four-way switch on `role` with an explicit `null` arm. Written as one
  // function because the deck and the empty states are different buttons (a
  // compact button in the top line for eligible signed-in readers and
  // a primary inside an empty state). The corner buttons never wrap because
  // they share the line with the category chips.
  //
  //   null (anonymous)  the EMPTY state's only — a logged-out reader's top
  //                     line carries "Sign in" instead. A plain LINK to
  //                     signup, carrying ADD_PRODUCT_PATH as
  //                     `next`: a new founder goes through onboarding first
  //                     (signupAction wraps it, lib/auth-href.ts
  //                     throughOnboarding) and lands on the form; a new
  //                     explorer lands on that page's explanation. It must NOT
  //                     be <SwitchToBuilding>: that posts to
  //                     upgradeToFounderAction, which answers "Not
  //                     authenticated. Please sign in again." to somebody who
  //                     has never signed in — the component's own header calls
  //                     a link into a refusal worse than no link, and that is
  //                     the worst version of it.
  //   "founder"         a link to ADD_PRODUCT_PATH, the Add product page —
  //                     the one place a product is added from, quietly (it is
  //                     never announced in the community feed). A founder who
  //                     has not onboarded is sent through /onboarding by
  //                     app/(app)/layout.tsx and comes back to it. Makers
  //                     with products use My products in the navigation.
  //   "explorer"        the one control that promotes them to a founder, and
  //                     it ends on ADD_PRODUCT_PATH after onboarding.
  //                     "Add yours" would point at a form they cannot use —
  //                     see ./SwitchToBuilding.tsx.
  //   "investor"        NOTHING. New audience: they could not read this route
  //                     at all before. They cannot post a product
  //                     (canPostProduct) and there is no investor -> founder
  //                     transition to offer, so every CTA available here would
  //                     be a link into a refusal. The shelf is read-only for
  //                     them, which is the investor posture everywhere else.
  //
  // SwitchToBuilding is a form and each instance owns its own pending/error
  // state, which is correct — a failure belongs next to the button pressed.
  const supplyCta = (place: "deck" | "empty") => {
    const quiet = place === "deck";
    if (role === null)
      return (
        <LinkButton href={authHref("/signup", ADD_PRODUCT_PATH)} size="sm">
          <Rocket className="h-4 w-4" strokeWidth={1.5} />
          {tJoinCofoundee}
        </LinkButton>
      );
    if (role === "explorer")
      return (
        <SwitchToBuilding
          label={quiet ? tSwitchToBuilding : tStartBuilding}
          variant={quiet ? "secondary" : "primary"}
        />
      );
    if (role === "investor") return undefined;
    if (quiet && hasOwnProducts) return undefined;
    return quiet ? (
      <LinkButton
        href={ADD_PRODUCT_PATH}
        variant="secondary"
        size="sm"
        className="whitespace-nowrap"
      >
        <Rocket className="h-4 w-4" strokeWidth={1.5} />
        {tAddYours}
      </LinkButton>
    ) : hasOwnProducts ? (
      // An EMPTY shelf can still have products of theirs behind it: a hidden
      // one, or one whose link the shelf refuses. Without this, the empty
      // state was the one place a maker could not reach My products from.
      <div className="flex flex-wrap items-center justify-center gap-2">
        <LinkButton href={ADD_PRODUCT_PATH} size="sm">
          {tEmptyCta}
        </LinkButton>
        <LinkButton href={MY_PRODUCTS_PATH} variant="secondary" size="sm">
          <Package className="h-4 w-4" strokeWidth={1.5} />
          {tMyProducts}
        </LinkButton>
      </div>
    ) : (
      <LinkButton href={ADD_PRODUCT_PATH} size="sm">
        {tEmptyCta}
      </LinkButton>
    );
  };
  const deckCta = user ? supplyCta("deck") : null;
  const emptyStateCta = supplyCta("empty");

  // The sentence above that CTA, split the same four ways because it has to
  // describe what the button does. Only a founder can add a product, so telling
  // every signed-in reader to go add one would send an explorer into
  // createProductAction's refusal, and an investor likewise, with no button at
  // all.
  const emptyBody =
    role === null
      ? tEmptyBodyAnon
      : role === "explorer"
        ? tEmptyBodyExplorer
        : role === "investor"
          ? undefined
          : tEmptyBody;

  // The browser filters the rows from getShelfProducts() after visibility and
  // blocked-pair checks. The swipe deck keeps server order and the grid sorts.
  //
  // `productBucketOf`, never `productCategoryOf`: an older show_and_tell has
  // no category tag, and a null must never reach a label lookup or a chip.
  //
  // The card shows images, description, rating, comment count, and the
  // mobile-only label where applicable. The product name supplies the link's
  // accessible name, the live region, and the review prompt's title.
  //
  // `href` is the maker's product, which "Try" opens in a new tab: the
  // `link` getShelfProducts() already ran through webUrl(), so it is http(s)
  // or the row is not on the shelf at all, and never a raw link_url.
  //
  // The footer row's href (/products/<id>) is built in the deck, not here,
  // because it carries the category the reader has chosen since
  // (deck-position.ts). It is ONE href for every audience: the product's page
  // serves a visitor and a member alike (app/(marketing)/products/[id]), so do
  // not branch it on the session. A dev fixture's /products/fixture-… renders
  // the sample in development and does not exist in a production build.
  //
  // `sample` marks a dev fixture for the review modal, which can show one but
  // not save it. NODE_ENV is a build-time constant and productFixtures() is []
  // in production, so this is false for every row a production build renders.
  const products: DeckProduct[] = shown.map((p) => {
    const name = productName(p, tAnonymous);
    const host = displayHost(p.link);
    const mobileOnly = phoneOnly(p.link, p.platforms);
    const platformLabels = mobileOnly ? [] : platformLabelsOf(p.platforms);
    const makerName = p.author?.full_name?.trim();
    return {
      id: p.id,
      bucket: productBucketOf(p.tags),
      name,
      maker: makerName ? { name: makerName, avatarUrl: p.author?.photo_url ?? null } : null,
      platformLabels: platformLabels.map((label) => t(label, locale)),
      blurb: p.content,
      isOwn: p.isOwn,
      href: p.link.toString(),
      host,
      // A phone-only app (its store link, or the maker's "Runs on"): a
      // computer pressing "Try" gets a code to scan instead (./PhoneHandoff.tsx).
      phones: phonePlatformsOf(p.link, p.platforms),
      storeLinks: productStoreLinksOf(p),
      mobileOnly,
      // One pass, so a product named "{host}" cannot be substituted into.
      tryAria: tTryAria.replace(/\{(name|host)\}/g, (_, key) =>
        key === "name" ? name : host,
      ),
      moreAria: tMoreAria.replace("{name}", () => name),
      images: productImages(p),
      rating: p.rating,
      createdAt: Date.parse(p.created_at),
      likeCount: p.likeCount,
      commentCount: p.commentCount,
      footerAria: cardFooterLabel(p, locale),
      reviewable: mayRate && !p.isOwn,
      liked: p.myLike,
      myScore: myScores.get(p.id) ?? null,
      sample: process.env.NODE_ENV !== "production" && isFixture(p.id),
    };
  });

  // The shelf's page heading is visually hidden. Wide cards show their own
  // product name below it in the document outline.
  const pageTitle = <h1 className="sr-only">{tTitle}</h1>;

  // The view switch sits beside the filters on phones. On wider screens,
  // members get it in the right corner and guests keep sign-in there.
  const leftCorner =
    user === null ? (
      <Link
        href="/"
        aria-label="Cofoundee"
        className="col-start-1 row-start-1 justify-self-start rounded-[10px]"
      >
        <BrandMark size="sm" />
      </Link>
    ) : deckCta ? (
      <div className="col-start-1 row-start-1 justify-self-start">{deckCta}</div>
    ) : null;
  const guestControls =
    user === null ? (
      <>
        <LanguageSwitcher />
        <AuthReturnLink
          base="/login"
          className={buttonClasses({
            variant: "secondary",
            size: "sm",
            className: "whitespace-nowrap",
          })}
        >
          {tSignIn}
        </AuthReturnLink>
      </>
    ) : null;

  // THE LEGAL LINKS, logged out only (the owner's call, 2026-11-11). With the
  // site footer gone this page had no way to the privacy notice (PDPA), the
  // terms or the code of conduct. A signed-in reader has the same trio in the
  // app shell's rail and phone menu (lib/sidebar.ts LEGAL_LINKS, the same
  // list), so they get nothing here.
  //
  // A small centred line under the Skip/Try buttons, at every width: one line
  // from ~355px wide (the Thai trio is ~322px at gap-x-3, measured against the
  // shipped fonts); a narrower phone wraps it onto two. It used to float in the
  // bottom-left corner beside the buttons from lg, taking no height, and the
  // owner rejected it there (2026-11-12): beside the row it read as a stray
  // element, not as the page's foot. It IS the page's foot now, spaced as the
  // mirror of the top line (THE EDGES MIRROR, at the root below): one gap under
  // the buttons (mt-3, lg:mt-4), the container's bottom padding under it. At
  // mt-2 / lg:mt-3 it sat nearer the buttons than the screen's edge and read
  // as their caption (the owner flagged it, 2026-11-12). It costs the card
  // 28px (32 from lg). Last in the DOM, so it is last in the tab order too.
  const legalLinks =
    user === null ? (
      <nav
        aria-label={tLegal}
        className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-muted lg:mt-4 lg:gap-x-4"
      >
        {legalTargets.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-navy">
            {l.label}
          </Link>
        ))}
      </nav>
    ) : null;

  // THE SPACING IS THE PAGE'S OWN: rhythm={false}, then explicit padding. It is
  // the exemption CLAUDE.md gives chat and article pages (the Section
  // primitive's `rhythm={false}` "for chat/article pages"; chat views "take no
  // vertical rhythm"), and for the same reason: those pages own their vertical
  // space because their content is not a stack of titled sections, and neither
  // is this one. The section rhythm exists to separate a page title and its
  // sections; this page has neither — an empty shelf is one EmptyState under a
  // visually hidden title, and 88px of marketing padding (or the app's 56)
  // above a single panel would only push it down the screen.
  //
  // It also takes the page OUT of the [data-shell="public"] block in
  // app/globals.css, on purpose: that block down-converts `py-[88px]` to the
  // app's 56px for a signed-in member, and there is nothing here for it to
  // match. Only the EMPTY shelf uses it now: the deck is one screen tall and
  // owns all of its spacing (below).
  const sectionClass = "pt-6 pb-12 lg:pt-8";

  if (products.length === 0) {
    return (
      <Section rhythm={false} className={sectionClass}>
        {pageTitle}
        <ProductFilterProvider initial={initialCategory}>
          <ProductFilters className="mb-5" />
        </ProductFilterProvider>
        {/* Whether the SHELF is empty is what separates this from the deck's
            own empty state: an empty shelf needs a maker, an empty filter needs
            the reader to widen it.

            The body is audience-specific, decided HERE because this is the only
            layer that knows who is reading. The founder copy tells you to add
            your product on /products/new; nobody else can, and with an empty
            shelf this IS the public front door, / as well as /products. */}
        <EmptyState
          icon={PackageOpen}
          title={tEmptyTitle}
          description={emptyBody}
          action={emptyStateCta}
        />
      </Section>
    );
  }

  // The deck owns the modal and its loading state. The details still render on the server.
  const productDetails = modalId && (
    <ProductPageBody
      id={modalId}
      mode="modal"
      search={{
        from: route === "/" ? "home" : "products",
        category: initialCategory ?? undefined,
        view: parseProductView(view),
        sort,
      }}
    />
  );

  // Card view fits the viewport. The signed-in shell deducts its 65px phone
  // top bar. The actions stay in view when the product summary scrolls.
  //
  // A card flying off must not widen the page, and a tilting one must not make
  // it scroll: both are clipped at this root, which is the viewport's edge.
  // `clip` and not `hidden` because this must not become a scroll container.
  //
  // Up to 1440px wide, past the system's 1120: an exemption like the chat
  // views' (CLAUDE.md, Layout), because the card is sized by the screen and on
  // a big one 1120 left a third of it empty. ./loading.tsx copies these
  // strings so the skeleton's deck lands where the real one does: change the
  // two together.
  //
  // THE EDGES MIRROR. The top line sits one edge padding below the top of the
  // screen and one gap above the card. The logged-out legal line uses the
  // same gap under the deck. Edge padding and gap are 12px, and 16px from lg.
  // On compact cards the buttons sit 12px under the stack (./ProductDeck.tsx).
  return (
    <ProductShelfFrame>
      {pageTitle}
      <ProductFilterProvider initial={initialCategory}>
        <div className="relative mx-auto flex min-h-0 w-full max-w-[1440px] flex-1 flex-col px-4 pt-3 pb-3 sm:px-6 lg:px-10 lg:pt-4 lg:pb-4 short:pt-2 short:pb-2 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))] max-sm:short:pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {/* Guest controls appear before the phone toolbar in tab order. */}
          <div className="grid grid-cols-[1fr_auto] items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
            {leftCorner}
            {guestControls && (
              <div className="col-start-2 row-start-1 flex items-center gap-3 justify-self-end sm:hidden">
                {guestControls}
              </div>
            )}
            <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:col-span-1 sm:col-start-2 sm:row-start-1 sm:justify-center sm:gap-3">
              <ProductFilters className="max-sm:justify-start" />
              <ProductViewSwitch className={user ? "sm:hidden" : undefined} />
            </div>
            <div className="hidden items-center gap-3 justify-self-end sm:col-start-3 sm:row-start-1 sm:flex">
              {user ? <ProductViewSwitch /> : guestControls}
            </div>
          </div>
          {/* The deck takes the rest. Everything here stays server-rendered
              except the client islands that read the selection. */}
          <div className="mt-3 flex min-h-0 flex-1 flex-col lg:mt-4 short:mt-2">
            <ProductDeck
              products={products}
              route={route}
              resumeAfter={resumeAfter}
              resumeAt={modalId}
              cardId={parseProductParam(card)}
              productDetails={productDetails}
              viewer={{
                signedIn: user !== null,
                canComment: role !== null && canComment(role),
              }}
              computer={(await viewerKind()) === "computer"}
              labels={{
                productFallback: tProduct,
                closeDetails: tClose,
                discardComment: tDiscard,
                deckName: tDeckName,
                skip: tSkip,
                like: tLike,
                tryIt: tTryIt,
                position: tDeckPosition,
                endTitle: tDeckEnd,
                startOver: tStartOver,
                join: role === null ? tJoinCofoundee : null,
                noneHereTitle: tNoneHereTitle,
                noneHereBody: tNoneHereBody,
                mobileOnly: tMobileOnly,
                seeEverything: tSeeEverything,
                previousImage: tPreviousImage,
                nextImage: tNextImage,
                previousGroup: tPreviousGroup,
                nextGroup: tNextGroup,
              }}
              supplyCta={emptyStateCta}
            />
          </div>
          {legalLinks}
        </div>
      </ProductFilterProvider>
    </ProductShelfFrame>
  );
}
