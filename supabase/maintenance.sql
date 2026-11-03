-- Optional housekeeping. Run in the Supabase SQL editor.

-- 1) Files in storage that no product image points at (orphans, e.g. from an interrupted upload).
--    Review the list first; delete from Storage -> product-images if you're sure.
select o.name as orphaned_file, o.created_at
  from storage.objects o
 where o.bucket_id = 'product-images'
   and not exists (select 1 from public.product_media m where m.storage_path = o.name)
 order by o.created_at desc;

-- 2) Confirm only the intended storage policies exist on your buckets (should list exactly 4 "Admins can ..." rows).
select policyname, cmd from pg_policies
 where schemaname = 'storage' and tablename = 'objects'
 order by policyname;

-- 3) Confirm who the administrators are.
select email, created_at from public.admin_users;
