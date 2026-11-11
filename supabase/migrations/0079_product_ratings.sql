-- 0079: product ratings — 1 to 5 stars, one per member per product.
--
-- ── THE DECISION THIS IMPLEMENTS ──────────────────────────────────────────
-- CLAUDE.md, Language Rules, "Founder decision (2026-11-10): products have star
-- ratings". Given deliberately by a signed-in member on the product's page
-- (never by a swipe), one per member per product, changeable, never on your
-- own product. Each member's rating is PRIVATE to them; only the average and
-- the count are public. Products only: never a person, a founder or a company.
--
-- A product is a forum_posts row with kind = 'show_and_tell' (lib/posts.ts),
-- so this table hangs off forum_posts and nothing else. There is no target_kind
-- column on purpose: a rating of a profile or an org cannot be expressed here,
-- which is the "products only" rule enforced by the schema's shape.
--
-- ── WHO CAN READ WHAT ─────────────────────────────────────────────────────
--   a member        their OWN rows, nothing else (RLS select_own). That is
--                   what lets the product page show "your rating".
--   anon            nothing — no policy and no grant.
--   the public      the average and the count, and ONLY through the server:
--                   product_rating_stats below is granted to service_role
--                   alone, and the app reads it with createAdminClient() the
--                   same way it already reads the public shelf (lib/posts.ts
--                   explains why RLS cannot serve a public page).
-- Nothing in this file lets one member read another member's score.
--
-- ── WHY THE WRITE POLICIES RE-CHECK THE POST ──────────────────────────────
-- The server action (setProductRatingAction) refuses an own product, a hidden
-- post and a non-product before it writes. That is the check for anyone using
-- the UI and for nobody else: PostgREST is reachable with any member's JWT, so
-- the same rules live in WITH CHECK, where a direct call meets them too — the
-- argument 0070 made for blocks, and 0074 for message edits.
--
-- The EXISTS reads forum_posts under the caller's own RLS. forum_posts'
-- SELECT policy for `authenticated` is `using (true)` today; if it is ever
-- narrowed, a post the caller can no longer see simply fails this check, so it
-- fails CLOSED. Qualified as `product_ratings.post_id` because an unqualified
-- `post_id` inside the subquery would bind to whatever column of that name
-- forum_posts might grow later.
--
-- NO ROLE CLAUSE. canRate (lib/roles.ts) is true for every role — founder,
-- explorer and investor — so there is nothing for RLS to refuse by role. If a
-- role is ever added that may not rate, its refusal has to be written here as
-- well as in the ladder.
--
-- ── GRANTS ARE STATED, NOT INHERITED ──────────────────────────────────────
-- pg_default_acl for schema public (read off the live database before this was
-- written) hands every NEW table and view `arwdDxtm` — every privilege,
-- TRUNCATE included — to anon, authenticated and service_role. TRUNCATE is not
-- subject to RLS at all. So this file revokes everything first and grants back
-- exactly what each role needs (the 0048 lesson: what a role can do is what
-- the grants say, so the grants are written down).
--
--   authenticated  SELECT, DELETE (RLS narrows both to own rows);
--                  INSERT / UPDATE on (post_id, user_id, score) only, so
--                  created_at and updated_at stay server-set.
--                  UPDATE includes post_id and user_id because supabase-js
--                  `upsert()` is PostgREST's merge-duplicates, which writes
--                  `DO UPDATE SET <every payload column> = EXCLUDED.<col>`,
--                  key columns included. That grants nothing new: moving a
--                  rating to another product is a delete plus an insert the
--                  member may already do, and WITH CHECK re-validates the
--                  destination and the user_id.
--   service_role   SELECT / INSERT / UPDATE / DELETE, for the server read and
--                  for admin cleanup.
--   anon           nothing.
--
-- Idempotent: `if not exists`, drop-then-create for policies and the trigger,
-- `or replace` for the view.
-- ============================================================================

create table if not exists public.product_ratings (
  post_id    uuid        not null references public.forum_posts (id) on delete cascade,
  user_id    uuid        not null references public.profiles (id) on delete cascade,
  score      smallint    not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One per member per product. Also the index the aggregate groups on: it
  -- leads with post_id.
  primary key (post_id, user_id),
  constraint product_ratings_score_range check (score between 1 and 5)
);

-- For the profiles -> product_ratings cascade, and for "my ratings" reads.
create index if not exists product_ratings_user_idx
  on public.product_ratings (user_id);

comment on table public.product_ratings is
  'One 1-5 star rating per member per product (forum_posts kind=show_and_tell). Private to the rater (RLS select_own); the public average and count are read through product_rating_stats by the service role only. Never on your own product. See CLAUDE.md "Founder decision (2026-11-10)".';
comment on column public.product_ratings.score is
  '1 to 5 inclusive (product_ratings_score_range).';

drop trigger if exists product_ratings_set_updated_at on public.product_ratings;
create trigger product_ratings_set_updated_at
  before update on public.product_ratings
  for each row execute function public.set_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.product_ratings enable row level security;

drop policy if exists "product_ratings_select_own" on public.product_ratings;
create policy "product_ratings_select_own"
  on public.product_ratings for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "product_ratings_insert_own" on public.product_ratings;
create policy "product_ratings_insert_own"
  on public.product_ratings for insert
  to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.forum_posts p
      where p.id = product_ratings.post_id
        and p.kind = 'show_and_tell'
        and p.hidden = false
        and p.author_id <> (select auth.uid())
    )
  );

drop policy if exists "product_ratings_update_own" on public.product_ratings;
create policy "product_ratings_update_own"
  on public.product_ratings for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1
      from public.forum_posts p
      where p.id = product_ratings.post_id
        and p.kind = 'show_and_tell'
        and p.hidden = false
        and p.author_id <> (select auth.uid())
    )
  );

-- Removing your own rating is always allowed — including on a post that has
-- since been hidden. It is the member's own data.
drop policy if exists "product_ratings_delete_own" on public.product_ratings;
create policy "product_ratings_delete_own"
  on public.product_ratings for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- ── GRANTS (see the header) ────────────────────────────────────────────────
revoke all on public.product_ratings from anon, authenticated, service_role;
grant select, delete on public.product_ratings to authenticated;
grant insert (post_id, user_id, score) on public.product_ratings to authenticated;
grant update (post_id, user_id, score) on public.product_ratings to authenticated;
grant select, insert, update, delete on public.product_ratings to service_role;

-- ── THE PUBLIC AGGREGATE ──────────────────────────────────────────────────
-- SUM and COUNT, not AVG: the app rounds the average to one decimal ONCE, from
-- two integers (lib/product-ratings.ts), so no surface can round 4.25 down and
-- another round it up.
--
-- security_invoker, so the view runs with the reader's privileges and RLS
-- rather than its owner's. service_role bypasses RLS and sees every row, which
-- is the one reader it is granted to. If someone ever grants it to
-- `authenticated`, a member would aggregate only their OWN rows — a useless
-- number, not a leak. A definer view would hand them everyone's.
create or replace view public.product_rating_stats
with (security_invoker = true) as
select
  post_id,
  count(*)::integer   as rating_count,
  sum(score)::integer as rating_sum
from public.product_ratings
group by post_id;

comment on view public.product_rating_stats is
  'Per-product rating count and sum. Service role only: the public reads the average and count through the server, never through PostgREST.';

revoke all on public.product_rating_stats from anon, authenticated, service_role;
grant select on public.product_rating_stats to service_role;
