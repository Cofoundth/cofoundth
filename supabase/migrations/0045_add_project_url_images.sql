-- "What are you building?" extras: an optional project link + up to 3 images,
-- shown under the About me section on the profile.
alter table public.profiles
  add column if not exists project_url text,
  add column if not exists project_images text[] not null default '{}';

alter table public.profiles
  add constraint project_url_format
  check (project_url is null or project_url ~* '^https?://.+');

alter table public.profiles
  add constraint project_images_count
  check (array_length(project_images, 1) is null or array_length(project_images, 1) <= 3);
