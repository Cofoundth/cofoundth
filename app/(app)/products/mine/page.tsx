// /products/mine — My products. A maker's own products in one place, each with
// its public rating and the latest comments on it, and the way to add another.
// The deck's top-right corner links here for a founder who has added a product
// (../../../(marketing)/products/ProductShelf.tsx, supplyCta); a founder who
// has not gets "Add yours" there instead, so an empty list is rare — the empty
// state below is for a typed URL.
//
// ── WHAT A MAKER SEES OF THEIR RATINGS ────────────────────────────────────
// The average and the count: the same two numbers every reader sees, nothing
// more. CLAUDE.md, "Founder decision (2026-11-10)": each member's rating is
// private to them. A per-star breakdown is left out ON PURPOSE — in a
// community this size, "one 1-star" beside a list of named commenters is
// enough to guess who gave it.
//
// ── WHO GETS WHAT ─────────────────────────────────────────────────────────
// An APP route, gated like ADD_PRODUCT_PATH (MY_PRODUCTS_PATH is in
// isAppShellRoute, lib/roles.ts):
//   signed out   requireUser sends them to /login with this page as `next`.
//   founder      the page. Not onboarded yet: app/(app)/layout.tsx sends them
//                through /onboarding first, as everywhere in the app.
//   explorer     reads the route (ROLE_ACCESS.explorer covers /products/*) and
//                is sent back to the shelf here: they post no product
//                (canPostProduct), so there is nothing of theirs to list.
//   investor     bounced to /funding by proxy.ts; the redirect below is the
//                same answer on a full load.
//
// ── READS ─────────────────────────────────────────────────────────────────
// Through the MEMBER'S OWN client: their own posts, the comments on them and
// the commenters' names, all readable to `authenticated` — the reads
// /community/<id> makes. Only the public rating goes through the service role
// (lib/product-ratings.ts), as on every product page.
//
// HIDDEN PRODUCTS ARE LISTED, MARKED. /community/<id> lets the author open
// their own hidden post, and a product that silently vanished from the deck
// with no word anywhere would be worse than a plain "a moderator hid this".
//
// Comments from blocked members are dropped, exactly as on /community/<id>,
// which is where "See all" leads — so the count here is the count there. The
// maker's own replies count too (they are in that thread), but the preview
// shows only what OTHER people said: it is the feedback, not the conversation.

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  EyeOff,
  MessageCircle,
  Package,
  PackageOpen,
  Plus,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account";
import { ADD_PRODUCT_PATH, canPostProduct, roleHome } from "@/lib/roles";
import { getBlockedIds } from "@/lib/blocking";
import { getProductRatings } from "@/lib/product-ratings";
import { CATEGORY_LABEL, UNRATED, productCategoryOf } from "@/lib/post-types";
import { getLocale, tServer } from "@/lib/i18n-server";
import { timeAgo } from "@/lib/time";
import { Avatar } from "@/components/Avatar";
import { ProductRatingSummary } from "@/components/ProductRatingSummary";
import { Card, EmptyState, LinkButton, Section } from "@/components/ui";
import {
  productImages,
  productName,
} from "@/app/(marketing)/products/product-view";

export const dynamic = "force-dynamic";

/** How many comments each product shows here; the rest are on its page. */
const LATEST_COMMENTS = 3;

type CommentRow = {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
};

export async function generateMetadata(): Promise<Metadata> {
  return { title: await tServer("My products") };
}

export default async function MyProductsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getAccountRole(supabase, user.id);
  if (!canPostProduct(role)) redirect(roleHome(role) ?? "/products");

  const locale = await getLocale();

  // Newest first, hidden ones included (see the header).
  const { data: rows } = await supabase
    .from("forum_posts")
    .select("id, title, content, image_url, image_urls, tags, created_at, hidden")
    .eq("author_id", user.id)
    .eq("kind", "show_and_tell")
    .order("created_at", { ascending: false });
  const products = rows ?? [];
  const ids = products.map((p) => p.id as string);

  const [ratings, blocked, { data: commentData }] = await Promise.all([
    getProductRatings(ids),
    getBlockedIds(user.id),
    ids.length
      ? supabase
          .from("forum_comments")
          .select("id, post_id, author_id, content, created_at")
          .in("post_id", ids)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as CommentRow[] }),
  ]);

  // Per product: how many comments its page shows, and the newest few that
  // someone other than the maker wrote.
  const counts = new Map<string, number>();
  const latest = new Map<string, CommentRow[]>();
  for (const c of (commentData ?? []) as CommentRow[]) {
    if (blocked.has(c.author_id)) continue;
    counts.set(c.post_id, (counts.get(c.post_id) ?? 0) + 1);
    if (c.author_id === user.id) continue;
    const list = latest.get(c.post_id) ?? [];
    if (list.length < LATEST_COMMENTS) {
      list.push(c);
      latest.set(c.post_id, list);
    }
  }

  const commenterIds = [
    ...new Set([...latest.values()].flat().map((c) => c.author_id)),
  ];
  const { data: commenters } = commenterIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, photo_url")
        .in("id", commenterIds)
    : { data: [] };
  const commenterMap = new Map(
    (commenters ?? []).map((p) => [p.id as string, p]),
  );

  const [
    tBack,
    tTitle,
    tIntro,
    tAddAnother,
    tEmptyTitle,
    tEmptyBody,
    tAddYourProduct,
    tAnonymous,
    tHidden,
    tViewProduct,
    tSeeAll,
    tSeeOne,
    tOneComment,
    tManyComments,
    tMember,
  ] = await Promise.all([
    tServer("Back to products"),
    tServer("My products"),
    tServer("Ratings and comments on what you've put on the shelf."),
    tServer("Add another"),
    tServer("You haven't added a product yet"),
    tServer(
      "Add it with a name, a link and a few screenshots. Its ratings and comments will collect here.",
    ),
    tServer("Add your product"),
    tServer("A founder"),
    tServer("Hidden by a moderator, so it is not on the deck"),
    // Not "View product": that key is the org page's, and its Thai is the
    // shop word (ดูสินค้า), not the shelf's โปรดักต์.
    tServer("View this product"),
    tServer("See all {n} comments"),
    tServer("See the comment"),
    tServer("{n} comment"),
    tServer("{n} comments"),
    tServer("A member"),
  ]);
  const categoryLabels = new Map(
    await Promise.all(
      Object.entries(CATEGORY_LABEL).map(
        async ([slug, label]) => [slug, await tServer(label)] as const,
      ),
    ),
  );

  return (
    <Section width="narrow">
      {/* Not prefetched: the shelf is a 200-row read, and this link is a way
          out, not the next step. Same as the Add product page. */}
      <Link
        href="/products"
        prefetch={false}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {tBack}
      </Link>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-d2 mb-2">{tTitle}</h1>
          <p className="text-sm text-ink-muted">{tIntro}</p>
        </div>
        {products.length > 0 && (
          <LinkButton
            href={ADD_PRODUCT_PATH}
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
          >
            <Plus className="h-4 w-4" strokeWidth={1.5} />
            {tAddAnother}
          </LinkButton>
        )}
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title={tEmptyTitle}
          description={tEmptyBody}
          action={
            <LinkButton href={ADD_PRODUCT_PATH} size="sm">
              {tAddYourProduct}
            </LinkButton>
          }
        />
      ) : (
        <ul className="space-y-4">
          {products.map((p) => {
            const id = p.id as string;
            const href = `/community/${id}`;
            const name = productName(
              {
                title: (p.title as string | null) ?? null,
                content: p.content as string,
              },
              tAnonymous,
            );
            const cover = productImages({
              id,
              image_url: (p.image_url as string | null) ?? null,
              image_urls: (p.image_urls as string[] | null) ?? null,
            })[0];
            const category = productCategoryOf((p.tags as string[] | null) ?? []);
            const count = counts.get(id) ?? 0;
            const shown = latest.get(id) ?? [];
            const countLabel = (count === 1 ? tOneComment : tManyComments).replace(
              "{n}",
              count.toLocaleString("en-US"),
            );
            return (
              <li key={id}>
                <Card padding="md">
                  <div className="flex items-start gap-4">
                    <Link
                      href={href}
                      tabIndex={-1}
                      aria-hidden="true"
                      className="relative grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-cream"
                    >
                      {cover ? (
                        // `unoptimized` for the reason ProductGallery gives:
                        // next.config declares no remote image hosts.
                        <Image
                          src={cover}
                          alt=""
                          fill
                          unoptimized
                          sizes="64px"
                          className="object-cover"
                        />
                      ) : (
                        <Package
                          className="h-6 w-6 text-ink-muted"
                          strokeWidth={1.5}
                        />
                      )}
                    </Link>
                    <div className="min-w-0 flex-1">
                      {/* Two lines at most: a product added before names were
                          required is titled by its description's first line
                          (productName), which can run to 160 characters. */}
                      <h3 className="line-clamp-2 text-xl">
                        <Link
                          href={href}
                          className="transition-colors hover:text-gold-ink"
                        >
                          {name}
                        </Link>
                      </h3>
                      <p className="mt-1 text-sm text-ink-muted">
                        {category ? `${categoryLabels.get(category)} · ` : ""}
                        {timeAgo(p.created_at as string, locale)}
                      </p>
                    </div>
                  </div>

                  {p.hidden === true && (
                    <p className="mt-4 flex items-start gap-2 rounded-xl border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-ink">
                      <EyeOff
                        className="mt-0.5 h-4 w-4 shrink-0"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      {tHidden}
                    </p>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                    <ProductRatingSummary
                      rating={ratings.get(id) ?? UNRATED}
                      locale={locale}
                    />
                    <span className="inline-flex items-center gap-1.5 text-ink">
                      <MessageCircle
                        className="h-4 w-4 shrink-0 text-navy"
                        strokeWidth={1.5}
                        aria-hidden="true"
                      />
                      <span className="tabular-nums">{countLabel}</span>
                    </span>
                  </div>

                  {/* Only when there is something to show: "0 comments" in the
                      row above already says the rest. */}
                  {shown.length > 0 && (
                    <ul className="mt-5 space-y-4 border-t border-line pt-5">
                      {shown.map((c) => {
                        const who = commenterMap.get(c.author_id);
                        const whoName =
                          (who?.full_name as string | null) ?? tMember;
                        return (
                          <li key={c.id} className="flex gap-3">
                            <Avatar
                              name={whoName}
                              url={(who?.photo_url as string | null) ?? null}
                              size="sm"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm">
                                <Link
                                  href={`/profile/${c.author_id}`}
                                  className="font-medium text-ink transition-colors hover:text-gold-ink"
                                >
                                  {whoName}
                                </Link>
                                <span className="text-ink-muted">
                                  {" · "}
                                  {timeAgo(c.created_at, locale)}
                                </span>
                              </p>
                              <p className="mt-0.5 line-clamp-3 whitespace-pre-line text-sm text-ink">
                                {c.content}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <LinkButton
                    href={count > shown.length ? `${href}#comments` : href}
                    variant="secondary"
                    size="sm"
                    className="mt-5"
                  >
                    {/* One comment the preview does not show is the maker's
                        own reply: "See all 1 comments" would be wrong twice. */}
                    {count > shown.length
                      ? count === 1
                        ? tSeeOne
                        : tSeeAll.replace("{n}", count.toLocaleString("en-US"))
                      : tViewProduct}
                  </LinkButton>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}
