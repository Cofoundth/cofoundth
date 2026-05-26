// Profile slug generation + classification.
//
// Mirrors the slugify_text() Postgres function from migration 0017. Keep
// the two in sync if you change the rules.

// Lowercase, replace any non-alphanumeric run with a single hyphen, trim.
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

// Match the DB constraint: lowercase alnum + hyphens, 3-50 chars,
// no leading/trailing hyphen.
export function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length >= 3 && s.length <= 50;
}

// Quick UUID check (v4-ish). Used by /profile/[id] to decide whether the
// route param is a legacy UUID share-link or a slug.
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}
