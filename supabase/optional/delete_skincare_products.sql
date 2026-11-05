-- OPTIONAL and PERMANENT: delete every product whose category is "Skincare".
--
-- You only need this if you want the old Skincare products gone. The normal migration
-- (20261103000000_categories_jewellery_home_scents.sql) keeps them and moves them to Beauty instead.
-- Run this BEFORE that migration, otherwise they will already have been moved to Beauty.
--
-- How to use (Supabase -> SQL Editor):
--   1. Run STEP 1 on its own and read the list. Those are the products that will be deleted.
--   2. If that's right, run STEP 2. It can't be undone.
--   3. Run STEP 3 to find the leftover photo files, then delete them in Storage -> product-images.

-- STEP 1: preview (changes nothing)
select name, published, stock, price
  from public.products
 where category = 'Skincare'
 order by name;

-- STEP 2: delete them. Their image records and any featured / "Your Next Favourite" spots
-- are removed automatically along with each product.
delete from public.products
 where category = 'Skincare'
returning name as deleted_product;

-- STEP 3: photo files that no product uses any more (Supabase cannot safely delete files from SQL;
-- remove these from Storage -> product-images).
select o.name as unused_file
  from storage.objects o
 where o.bucket_id = 'product-images'
   and not exists (select 1 from public.product_media m where m.storage_path = o.name)
 order by o.created_at desc;
