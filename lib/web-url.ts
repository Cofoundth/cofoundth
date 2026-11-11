// The ONE parse a member-submitted URL goes through before it reaches an href.
//
// `forum_posts.link_url` is user-submitted, plain text, and older than the
// write-side checks (createPostAction's `^https?://`; createProductAction runs
// that and this parse too), so a row can hold anything — a
// `javascript:` URL in it, rendered unparsed, is a one-click script injection.
// So every href built from it goes through webUrl(), and anything that is not
// `http:`/`https:` renders NO link at all. Parsing (rather than a prefix test)
// is also what resolves `https://apps.apple.com@evil.example.com/` to
// evil.example.com for whoever shows the reader where a link goes.
//
// No imports and no "use client": the shelf (server), the product pages
// (server), the community feed card (client) and the sitemap all call it, and
// the shelf's own module, app/(marketing)/products/product-view.ts, re-exports
// it so its consumers keep one name for one function.

/** A URL we are willing to put in an href, or null. */
export function webUrl(raw: string | null | undefined): URL | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? u : null;
  } catch {
    return null;
  }
}
