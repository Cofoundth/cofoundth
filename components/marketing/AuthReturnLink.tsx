"use client";

// The logged-out chrome's "Sign in" and "Join" links (MarketingNav and
// MarketingFooter), which bring the reader back to the product they were
// looking at.
//
// A product's page (/p/<id>) and the deck (/products) carry `?next=` back to
// themselves — the page with its deck context (`from`, `category`), the deck
// with its category and position (`after`) — so signing in from the header of
// a product page lands on that product, and from the deck on the same card.
// Every other marketing page keeps the plain /login and /signup it always had:
// "come back here" is a promise these two pages make, not the whole site.
//
// The query is REBUILT from parsed values (./deck-position.ts's parsers), never
// copied, so an address with junk in it does not carry the junk into `next`.
// Reading `next` safely is still the reader's job (lib/safe-next.ts).
//
// A client component because the marketing layout is not re-rendered on a
// soft navigation: a server-built href would keep naming the page the layout
// first rendered on. usePathname/useSearchParams follow every navigation, and
// a replaceState the deck makes (`after`). Inside Suspense with the plain link
// as the fallback, because useSearchParams() opts a statically rendered page
// out to the nearest boundary.

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { authHref } from "@/lib/auth-href";
import { parseCategoryParam, PARAM } from "@/app/(marketing)/products/categories";
import {
  AFTER_PARAM,
  deckContextQuery,
  parseAfterParam,
} from "@/app/(marketing)/products/deck-position";

type Props = {
  base: "/login" | "/signup";
  className?: string;
  children: ReactNode;
};

/** Where signing in from this page should come back to, or null for "the
 *  usual place". */
function returnPathOf(pathname: string, search: URLSearchParams): string | null {
  if (/^\/p\/[^/]+$/.test(pathname)) {
    return `${pathname}${deckContextQuery({
      from: search.getAll("from"),
      category: search.getAll(PARAM),
    })}`;
  }
  if (pathname === "/products") {
    const query = new URLSearchParams();
    const category = parseCategoryParam(search.getAll(PARAM));
    const after = parseAfterParam(search.getAll(AFTER_PARAM));
    if (category) query.set(PARAM, category);
    if (after) query.set(AFTER_PARAM, after);
    const q = query.toString();
    return q ? `/products?${q}` : "/products";
  }
  return null;
}

function Returning({ base, className, children }: Props) {
  const pathname = usePathname();
  const search = useSearchParams();
  const back = returnPathOf(pathname, new URLSearchParams(search.toString()));
  return (
    <Link href={back ? authHref(base, back) : base} className={className}>
      {children}
    </Link>
  );
}

export function AuthReturnLink(props: Props) {
  return (
    <Suspense
      fallback={
        <Link href={props.base} className={props.className}>
          {props.children}
        </Link>
      }
    >
      <Returning {...props} />
    </Suspense>
  );
}
