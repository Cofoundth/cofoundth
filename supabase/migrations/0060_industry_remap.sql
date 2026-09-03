-- ============================================================================
-- Remap stored industry labels onto the widened taxonomy. DATA-ONLY.
--
-- profiles.industry is text[] of LABELS (0001), not slugs, so renaming a label
-- in lib/industries.ts orphans every stored copy of the old string: the browse
-- filter offers the new label, the profile still carries the old one, and the
-- value degrades into an unfilterable custom chip that no filter can ever
-- select. Measured against the live table before writing this: of 38 distinct
-- stored values, only 7 survive the rename byte-identical (Cybersecurity,
-- E-commerce, FinTech, Food & Beverage, Manufacturing, Real Estate, SaaS).
-- The other 31 are remapped below.
--
-- The list also picks up drift that predates the rename: free-text entries the
-- "Other — type and press Enter" box accepted (EmbeddedLinux, SpaceTech,
-- Foodtech, PR) and pure casing variants sitting alongside their canonical
-- twin (Fintech/FinTech, Edtech/EdTech, Agritech, Healthtech, Proptech,
-- Traveltech). Those collapse onto one label here.
--
-- The -Tech rows collapse onto their trade on purpose: the new taxonomy names
-- the trade, not the delivery mechanism, so EdTech is Education and HealthTech
-- is Healthcare. Nobody loses a category; the tutoring school and the learning
-- app now sit in the same one, which is the point of the repositioning.
--
-- DISTINCT matters: a profile carrying both "EdTech" and "Edtech" would
-- otherwise end up with "Education" twice.
--
-- Idempotent — after it runs the old strings no longer exist, so a second run
-- matches nothing. Safe to re-apply.
-- ============================================================================

with remap(old, new) as (
  values
    -- technology-suffixed labels collapse onto the trade they describe
    ('AI / ML',          'AI'),
    ('AgriTech',         'Agriculture & Fisheries'),
    ('Agritech',         'Agriculture & Fisheries'),
    ('EdTech',           'Education'),
    ('Edtech',           'Education'),
    ('HealthTech',       'Healthcare'),
    ('Healthtech',       'Healthcare'),
    ('PropTech',         'Real Estate'),
    ('Proptech',         'Real Estate'),
    ('Foodtech',         'Food & Beverage'),
    ('Traveltech',       'Travel & Tourism'),
    ('MarTech',          'Marketing & Advertising'),
    ('GovTech',          'Software & IT Services'),
    ('DeepTech',         'Software & IT Services'),
    ('Data / Analytics', 'Software & IT Services'),
    -- casing drift
    ('Fintech',          'FinTech'),
    -- widened or renamed labels
    ('Consumer',         'Consumer Goods'),
    ('Creative / Design','Design & Creative'),
    ('Hardware / IoT',   'Electronics & Hardware'),
    ('Media / Content',  'Media & Content'),
    ('Web3 / Crypto',    'Crypto & Web3'),
    ('Gaming',           'Gaming & Esports'),
    ('Logistics',        'Logistics & Supply Chain'),
    ('Travel',           'Travel & Tourism'),
    ('Wellness',         'Wellness & Spa'),
    ('Sustainability',   'Sustainability & Climate'),
    ('Climate / Energy', 'Sustainability & Climate'),
    ('Social Impact',    'Nonprofit & Social Impact'),
    -- free text the "Other" box let through
    ('PR',               'Marketing & Advertising'),
    ('EmbeddedLinux',    'Electronics & Hardware'),
    ('SpaceTech',        'Electronics & Hardware')
),
fixed as (
  select
    p.id,
    array(
      select distinct coalesce(r.new, e.val)
      from unnest(p.industry) as e(val)
      left join remap r on r.old = e.val
    ) as arr
  from public.profiles p
  where cardinality(p.industry) > 0
)
update public.profiles p
set industry = f.arr
from fixed f
where p.id = f.id
  and p.industry is distinct from f.arr;
