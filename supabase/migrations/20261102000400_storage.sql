-- Storage buckets and access policies.
--   product-images : product photos and 360° frames
--   site-media     : logo, hero and section images
-- Both are PUBLIC for reading (the storefront shows them to everyone) but only
-- administrators can upload, replace or delete. Size and type limits are enforced by Storage itself.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('site-media',     'site-media',     true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Admins can list media objects" on storage.objects;
drop policy if exists "Admins can upload media objects" on storage.objects;
drop policy if exists "Admins can replace media objects" on storage.objects;
drop policy if exists "Admins can delete media objects" on storage.objects;

-- No public SELECT policy on purpose: public buckets serve files by URL without one,
-- and leaving it out stops visitors from LISTING every file name (including drafts).
create policy "Admins can list media objects" on storage.objects
  for select to authenticated
  using (bucket_id in ('product-images', 'site-media') and public.is_admin());

create policy "Admins can upload media objects" on storage.objects
  for insert to authenticated
  with check (bucket_id in ('product-images', 'site-media') and public.is_admin());

create policy "Admins can replace media objects" on storage.objects
  for update to authenticated
  using (bucket_id in ('product-images', 'site-media') and public.is_admin())
  with check (bucket_id in ('product-images', 'site-media') and public.is_admin());

create policy "Admins can delete media objects" on storage.objects
  for delete to authenticated
  using (bucket_id in ('product-images', 'site-media') and public.is_admin());
