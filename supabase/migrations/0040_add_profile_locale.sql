-- Persist each user's UI language so transactional emails (interest / match)
-- can be sent in the language they actually use. Set on every language switch
-- (see app/actions/locale.ts). Defaults to 'en' to match DEFAULT_LOCALE.

alter table public.profiles
  add column if not exists locale text not null default 'en'
  check (locale in ('en','th'));
