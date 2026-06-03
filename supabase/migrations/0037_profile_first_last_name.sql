-- Split name into first_name + last_name (full_name kept as the display field).
alter table public.profiles add column if not exists first_name text;
alter table public.profiles add column if not exists last_name text;

-- Backfill from existing full_name: first token = first name, rest = last name.
update public.profiles
set first_name = trim(split_part(full_name, ' ', 1)),
    last_name = trim(substr(full_name, length(split_part(full_name, ' ', 1)) + 1))
where full_name is not null
  and coalesce(first_name, '') = '';
