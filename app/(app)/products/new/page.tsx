// /products/new — Add product. The ONE place a product is put on the shelf.
//
// It used to be the community composer's "Show & tell" tab, which meant adding
// a product announced it to the whole feed. The founder decided otherwise
// (CLAUDE.md, Language Rules): a product is added QUIETLY here and appears on
// the deck and its own page only — never in the community feed, its search or
// the landing's "Happening now". Announcing it is the maker's choice, by
// writing a normal post.
//
// ── WHO GETS WHAT ─────────────────────────────────────────────────────────
// An APP route (app/(app)), so app/(app)/layout.tsx and proxy.ts gate it
// through lib/roles.ts like every other one — ADD_PRODUCT_PATH is in
// isAppShellRoute:
//   signed out          the layout sends them to /login with this page as
//                       `next` (lib/auth.ts loginHref), so signing in
//                       comes back here.
//   founder, onboarded  the form.
//   founder, not yet    the layout sends them through /onboarding with this
//                       page as `next`, so they come back here.
//   explorer            READS the route (ROLE_ACCESS.explorer) and gets why
//                       they cannot add one yet, with Switch to building —
//                       which promotes them, runs onboarding and ends here.
//   investor            never arrives: proxy.ts bounces them to /funding, and
//                       the layout does on a full load. The redirect below is
//                       defence in depth for any role canPostProduct refuses
//                       that is not an explorer.
// The write is gated again inside createProductAction, because a server action
// is invocable without ever rendering this page.
//
// ── THE PAGE ──────────────────────────────────────────────────────────────
// A single-column form page (CLAUDE.md, Layout): the 640px container, the
// app rhythm (Section's default), a flat text-d2 title, and the form in a
// `lg` Card — the page-level single-panel tier.

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getAccountRole } from "@/lib/account";
import { canPostProduct, roleHome } from "@/lib/roles";
import { tServer } from "@/lib/i18n-server";
import { Card, Section } from "@/components/ui";
import { SwitchToBuilding } from "@/app/(marketing)/products/SwitchToBuilding";
import { AddProductForm } from "./AddProductForm";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { title: await tServer("Add your product") };
}

export default async function AddProductPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const role = await getAccountRole(supabase, user.id);
  const mayAdd = canPostProduct(role);

  if (!mayAdd && role !== "explorer") redirect(roleHome(role) ?? "/products");

  const [tBack, tTitle, tIntro] = await Promise.all([
    tServer("Back to products"),
    tServer("Add your product"),
    tServer("Put something you made on the shelf, for people to try."),
  ]);

  return (
    <Section width="narrow">
      {/* Not prefetched: the shelf is a 200-row read, and this link is a way
          out, not the next step. */}
      <Link
        href="/products"
        prefetch={false}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-ink-muted transition-colors hover:text-navy"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
        {tBack}
      </Link>

      <div className="mb-8">
        <h1 className="text-d2 mb-2">{tTitle}</h1>
        <p className="text-sm text-ink-muted">{tIntro}</p>
      </div>

      {mayAdd ? (
        <Card padding="lg">
          <AddProductForm />
        </Card>
      ) : (
        // THE EXPLORER. createProductAction's own refusal, said here before
        // they type anything, and the one control that changes the answer.
        // SwitchToBuilding promotes the account and then runs onboarding with
        // this page as `next` (app/actions/account-role.ts), so it ends here,
        // with the form.
        <Card padding="lg">
          <p className="text-ink">
            {await tServer(
              "The shelf is for members who build. Switch to building to post a product.",
            )}
          </p>
          <p className="mt-2 mb-6 text-sm text-ink-muted">
            {await tServer(
              "You’ll set up a short founder profile first, then come straight back here to add it.",
            )}
          </p>
          <SwitchToBuilding
            label={await tServer("Switch to building")}
            variant="primary"
          />
        </Card>
      )}
    </Section>
  );
}
