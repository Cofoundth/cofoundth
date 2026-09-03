-- ============================================================================
-- Bring organizations.industry onto the shared taxonomy. DATA-ONLY.
--
-- organizations.industry (0049) is text[] like profiles.industry, but the create
-- form collected it as free text and never referenced lib/industries.ts. So a
-- company could describe itself as "Tech" while every founder profile said
-- "Software & IT Services" — one concept, two strings. The company search on
-- /companies matches org industries as plain text, so the divergence quietly
-- cost relevance rather than failing loudly.
--
-- The form now uses the same controlled vocabulary as profiles and the action
-- whitelists it server-side, so this backfills the rows written before that.
--
-- Values found in the live table, and what happens to each:
--   Logistics   -> Logistics & Supply Chain   (renamed in the widened taxonomy)
--   Tech        -> Software & IT Services     (literal mapping of a generic word)
--   Community   -> DROPPED                    (a product category, not an
--                  industry; the org carrying it also has SaaS, which covers it)
--   E-commerce, SaaS                          (already exact taxonomy matches)
--
-- "Tech" is mapped literally rather than interpreted. One of the affected orgs
-- is a payments app whose accurate label is FinTech, but reclassifying someone's
-- company from its tagline is the owner's call, not a migration's.
--
-- DISTINCT guards against a row ending up with the same label twice; the array
-- is rebuilt rather than patched so dropped values disappear cleanly.
-- Idempotent: after this runs none of the source strings exist.
-- ============================================================================

with remap(old, new) as (
  values
    ('Logistics', 'Logistics & Supply Chain'),
    ('Tech',      'Software & IT Services'),
    ('Community', null)          -- null => dropped from the array
),
fixed as (
  select
    o.id,
    array(
      select distinct coalesce(r.new, e.val)
      from unnest(o.industry) as e(val)
      left join remap r on r.old = e.val
      -- a mapped-to-null value is removed, an unmapped value is kept as-is
      where r.old is null or r.new is not null
    ) as arr
  from public.organizations o
  where cardinality(o.industry) > 0
)
update public.organizations o
set industry = f.arr
from fixed f
where o.id = f.id
  and o.industry is distinct from f.arr;
