-- Public bucket for post image attachments.
-- Uploads go through the service-role client (browser can't upload directly on
-- this project — Storage doesn't validate the asymmetric ES256 user JWTs).
-- Public bucket => readable via public URL; service role bypasses RLS to write.
insert into storage.buckets (id, name, public)
values ('post-images', 'post-images', true)
on conflict (id) do nothing;
