-- 0087: the monthly draw's one stored fact — who won which month.
--
-- The draw is a founder-approved exception to "no gamification" (CLAUDE.md,
-- 2026-11-17): members who give feedback on 3 different posts or products a
-- day, 5 days in a row, go into a monthly draw for a small prize (one lottery
-- ticket). Who QUALIFIES is never stored: lib/rewards.ts recomputes it from
-- the comments that exist, so a deleted or removed comment stops counting the
-- moment it goes. Only the RESULT is stored, here, once:
--
--   · `month` is the primary key, so a month is drawn once and can never be
--     quietly drawn again until the result suits someone.
--   · `eligible_count` records how many were in the draw, the number a public
--     announcement can quote.
--   · `drawn_by` / `drawn_at` say who pressed the button and when.
--
-- Written ONLY by the admin draw (lib/admin-actions.ts drawMonthlyWinner),
-- through the service role. A member can read exactly one kind of row: a
-- draw they won, so /rewards can tell them. Nobody else's result is readable
-- by members: the winner is announced by the team, with the winner's consent.

create table if not exists public.monthly_draws (
  month date primary key check (extract(day from month) = 1),
  winner_id uuid references public.profiles (id) on delete set null,
  eligible_count integer not null check (eligible_count > 0),
  drawn_by uuid references public.profiles (id) on delete set null,
  drawn_at timestamptz not null default now()
);

comment on table public.monthly_draws is
  'One row per drawn month (0087). Eligibility is computed from comments (lib/rewards.ts), never stored. Written only through the service role by the admin draw; a member reads only a draw they won.';

alter table public.monthly_draws enable row level security;

drop policy if exists monthly_draws_select_own_win on public.monthly_draws;
create policy monthly_draws_select_own_win on public.monthly_draws
  for select to authenticated
  using (winner_id = (select auth.uid()));

-- Belt and braces under RLS (which already has no write policy): the browser
-- roles get read only.
revoke all on public.monthly_draws from anon, authenticated;
grant select on public.monthly_draws to authenticated;

-- ── VERIFY AFTER APPLYING ─────────────────────────────────────────────────
-- As a member (set local role authenticated + request.jwt.claims), rolled back:
--   insert / update / delete                  -> ERROR 42501
--   select                                    -> only rows where they won
-- As the service role: insert a month         -> 1 row; the same month again
--                                              -> ERROR 23505
