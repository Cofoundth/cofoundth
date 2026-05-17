-- Cofoundee — mark both interests as `accepted` when a mutual match forms.
--
-- Bug fix: the original handle_mutual_interest trigger created a `matches` row
-- but left both `interests` rows at status='pending'. The nav badge counting
-- "received pending interests" then included matched-and-resolved ones forever,
-- showing a stuck number even after both sides reciprocated.

create or replace function handle_mutual_interest()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  a uuid;
  b uuid;
begin
  if exists (
    select 1
    from public.interests
    where from_profile_id = new.to_profile_id
      and to_profile_id = new.from_profile_id
  ) then
    -- Canonical ordering for matches uniqueness
    if new.from_profile_id < new.to_profile_id then
      a := new.from_profile_id;
      b := new.to_profile_id;
    else
      a := new.to_profile_id;
      b := new.from_profile_id;
    end if;

    insert into public.matches (profile_a_id, profile_b_id)
    values (a, b)
    on conflict do nothing;

    -- Mark BOTH interests as accepted now that the match exists.
    update public.interests
    set status = 'accepted'
    where
      (from_profile_id = new.from_profile_id and to_profile_id = new.to_profile_id)
      or
      (from_profile_id = new.to_profile_id and to_profile_id = new.from_profile_id);
  end if;
  return new;
end;
$$;

-- Backfill: any existing pending interest where a match already exists
-- (covers users who tested the flow before this fix).
update interests i
set status = 'accepted'
where status = 'pending'
  and exists (
    select 1 from matches m
    where (m.profile_a_id = i.from_profile_id and m.profile_b_id = i.to_profile_id)
       or (m.profile_a_id = i.to_profile_id and m.profile_b_id = i.from_profile_id)
  );
