-- Category change: "Skincare" is retired; "Jewellery" and "Home Scents" are new.
-- (The list of categories itself lives in packages/types/src/index.ts, shared by the admin and the shop.)
--
-- This migration is NON-DESTRUCTIVE: products that were in Skincare are kept and moved to Beauty,
-- so nothing disappears from the shop. Their prices, stock, images, featured spots and published
-- status are untouched. You can then re-categorise any of them from the admin.
--
-- Prefer to DELETE the old Skincare products instead? Run supabase/optional/delete_skincare_products.sql
-- BEFORE applying this migration. If none are left, this migration simply does nothing.
-- Safe to run more than once.

update public.products
   set category = 'Beauty'
 where category = 'Skincare';
