-- 0088: a draw keeps the pool it was drawn from.
--
-- 0087 stored the winner and how many were in the draw, but not WHO. The
-- entrants are recomputed from the comments that exist (lib/rewards.ts), so a
-- week after a draw the admin page could list a different set under "In the
-- draw" than the one the winner came out of — a post deleted since, a comment
-- removed — next to an eligible_count it no longer matched, and nobody could
-- answer "was I in it?". Found in review, 2026-11-17, before any draw ran.
--
-- So the draw stores the ids it picked from, in the order it indexed them
-- (sorted by id). The admin page shows that list once a month is drawn.
--
-- MEMBERS STILL SEE ONLY THEIR OWN WIN, and now only these columns of it: the
-- pool is other members' ids, which a winner has no reason to read. The
-- table-level SELECT grant 0087 gave `authenticated` becomes a column grant,
-- because in Postgres a table-level grant covers every column, new ones
-- included (the lesson 0048 and 0078 record).

alter table public.monthly_draws
  add column if not exists entrant_ids uuid[] not null default '{}';

alter table public.monthly_draws
  drop constraint if exists monthly_draws_entrants_match;
alter table public.monthly_draws
  add constraint monthly_draws_entrants_match
    check (cardinality(entrant_ids) = 0 or cardinality(entrant_ids) = eligible_count);

comment on column public.monthly_draws.entrant_ids is
  'The members the draw picked from, sorted by id, as they were when it ran (0088). Admin-only: not granted to authenticated.';

revoke select on public.monthly_draws from authenticated;
grant select (month, winner_id, eligible_count, drawn_at)
  on public.monthly_draws to authenticated;

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- As the winner (authenticated), rolled back:
--   select month, winner_id from monthly_draws   -> their row
--   select entrant_ids from monthly_draws        -> ERROR 42501
-- As the service role: insert with entrant_ids of eligible_count ids -> ok;
--   a list of the wrong length                  -> ERROR 23514
