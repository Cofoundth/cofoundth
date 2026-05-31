-- Optional structured background: work experience + education (freeform text).
-- Complements the existing freeform `background` bio (LinkedIn-style:
-- About + Experience + Education).
alter table public.profiles add column if not exists work_experience text;
alter table public.profiles add column if not exists education text;
