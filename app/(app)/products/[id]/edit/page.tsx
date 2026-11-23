// /products/<id>/edit — a maker or an admin changes the name, the
// description, the link, the category, where it runs and the screenshots. The
// same form as Add product (../../ProductForm.tsx), saved in place by
// updateProductAction (lib/post-actions.ts), so the product keeps its page,
// its ratings and its comments. Quiet like adding: nothing is posted.
//
// ── WHO GETS WHAT ─────────────────────────────────────────────────────────
// An APP route (app/(app)), matched by shape in isAppShellRoute
// (lib/roles.ts isEditProductPath), so app/(app)/layout.tsx and proxy.ts gate
// it like Add product:
//   signed out   the layout sends them to /login with this page as `next`.
//   founder      the form, for a product of their own. Admins can also edit
//                any curated listing. Other listings, a post,
//                or an id that is not there is a 404 — which says nothing
//                about whose it is. Not onboarded yet: the layout sends them
//                through /onboarding first, as everywhere in the app.
//   explorer     reads the route (ROLE_ACCESS.explorer covers /products/*)
//                and is sent back to the shelf: they post no product
//                (canPostProduct), so there is nothing of theirs to edit.
//   investor     bounced to /funding by proxy.ts.
// updateProductAction re-checks all of it, because a server action is
// invocable without ever rendering this page.
//
// A product a moderator hid can still be edited — it is still the maker's —
// and says so above the form: editing it does not put it back on the deck.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, EyeOff } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { CURATED_PRODUCT_LABEL } from "@/lib/curated-products";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account";
import { canPostProduct, roleHome } from "@/lib/roles";
import { tServer } from "@/lib/i18n-server";
import {
  postImages,
  productCategoryOf,
  productPath,
  productPlatformsOf,
} from "@/lib/post-types";
import { Card, CardChip, Section } from "@/components/ui";
import { readProductForEdit } from "@/lib/product-edit-access";
import { ProductForm } from "../../ProductForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await tServer("Edit product") };
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getAccountRole(supabase, user.id);
  const mayEditOwn = canPostProduct(role);
  const target = await readProductForEdit(supabase, user, id, mayEditOwn);
  if (!target) {
    if (!mayEditOwn) redirect(roleHome(role) ?? "/products");
    notFound();
  }
  const { post } = target;

  const [tBack, tTitle, tIntro, tHidden] = await Promise.all([
    tServer("Back to the product"),
    tServer("Edit product"),
    tServer("Change what people see. Its ratings and comments stay with it."),
    tServer("Hidden by a moderator, so it is not on the deck"),
  ]);

  return (
    <Section width="narrow">
      <Link
        href={productPath(id)}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {tBack}
      </Link>

      <div className="mb-8">
        {post.is_curated && <CardChip className="mb-2">{CURATED_PRODUCT_LABEL}</CardChip>}
        <h1 className="text-d2 mb-2">{tTitle}</h1>
        <p className="text-sm text-ink-muted">{tIntro}</p>
      </div>

      {post.hidden === true && (
        <p className="mb-5 flex items-start gap-2 rounded-xl border border-danger-line bg-danger-surface px-3 py-2 text-sm text-danger-ink">
          <EyeOff
            className="mt-0.5 h-4 w-4 shrink-0"
            strokeWidth={1.5}
            aria-hidden="true"
          />
          {tHidden}
        </p>
      )}

      <Card padding="lg">
        <ProductForm
          product={{
            id,
            title: (post.title as string | null) ?? "",
            content: post.content as string,
            link: (post.link_url as string | null) ?? "",
            iosStoreUrl: post.ios_store_url,
            androidStoreUrl: post.android_store_url,
            category: productCategoryOf((post.tags as string[] | null) ?? []),
            platforms: productPlatformsOf(post.platforms),
            images: postImages({
              image_url: (post.image_url as string | null) ?? null,
              image_urls: (post.image_urls as string[] | null) ?? null,
            }),
            hidden: post.hidden === true,
            isCurated: post.is_curated,
          }}
        />
      </Card>
    </Section>
  );
}
