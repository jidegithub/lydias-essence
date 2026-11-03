-- Development seed data: the 16 sample products the storefront originally shipped with.
-- Safe to re-run. For a REAL shop, add products through the admin dashboard instead
-- (run this file only if you want the demo catalogue as a starting point).
-- Contains no passwords, keys or personal data.

insert into public.products
  (id, name, slug, category, description, price, sale_price, discount_enabled, stock, image_url, image_urls, published, sort_order, background_theme)
values
  ('cddcf0f7-9a83-566b-ac5f-b95b4e959bed', 'Dewdrop Hydrating Serum', 'dewdrop-hydrating-serum', 'Skincare', 'A lightweight hydrating serum for a fresh, dewy-looking complexion.', 18500, null, false, 24, 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=85'), true, 0, 'default'),
  ('4aa8834f-a96d-5d29-a303-44fea86742b6', 'Cloud Nine Cleanser', 'cloud-nine-cleanser', 'Skincare', 'A gentle everyday cleanser for a clean, comfortable skin feel.', 12500, null, false, 18, 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85'), true, 1, 'default'),
  ('0246c587-ce92-5cf6-ab59-1dd8fafd9839', 'Velvet Glow Moisturizer', 'velvet-glow-moisturizer', 'Skincare', 'A comforting daily moisturizer for soft, supple-looking skin.', 22000, 19500, true, 12, 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85'), true, 2, 'default'),
  ('9c53bad6-2d75-5a47-b690-ec19353115e2', 'Sunveil SPF Essence', 'sunveil-spf-essence', 'Skincare', 'A lightweight sunscreen concept for the final step of a morning routine.', 16500, null, false, 20, 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85'), true, 3, 'default'),
  ('cbed0ec6-6678-576f-9835-cb0d547726a9', 'Vanilla Reverie', 'vanilla-reverie', 'Perfumes', 'A warm gourmand fragrance concept with soft vanilla-inspired notes.', 38000, null, false, 9, 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85'), true, 4, 'default'),
  ('f73ac390-be40-51af-8581-67869336f7b8', 'Midnight Oud', 'midnight-oud', 'Perfumes', 'A rich, evening-inspired fragrance concept with a sophisticated mood.', 52000, 47000, true, 7, 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85'), true, 5, 'default'),
  ('39a4caec-9488-53bb-8a5f-c43eefd68dbe', 'Petal & Silk', 'petal-silk', 'Perfumes', 'A soft floral fragrance concept inspired by delicate petals.', 32000, null, false, 14, 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85'), true, 6, 'default'),
  ('43c52a7e-8dd9-5c3c-a0b2-490065f7b28c', 'Bare Essence', 'bare-essence', 'Perfumes', 'A clean, understated fragrance concept for everyday wear.', 35000, null, false, 11, 'https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85'), true, 7, 'default'),
  ('bbb32a22-b2db-5a76-a407-51f5ddcb9a48', 'Rosewater Lip Gloss', 'rosewater-lip-gloss', 'Beauty', 'A glossy rose-inspired lip look with an understated finish.', 8500, null, false, 30, 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85'), true, 8, 'default'),
  ('bc4bbcbd-1ebb-59f8-9daa-a3267771c5d2', 'Silk Touch Body Butter', 'silk-touch-body-butter', 'Beauty', 'A rich body-care concept for a pampering self-care ritual.', 14500, null, false, 16, 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85'), true, 9, 'default'),
  ('c1da6b47-70c4-5fff-8695-1ca438c79bee', 'The Everyday Brush Set', 'the-everyday-brush-set', 'Beauty', 'A sample makeup brush collection for everyday beauty routines.', 19500, 17500, true, 8, 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=85'), true, 10, 'default'),
  ('bda9d46b-4069-5e44-acc2-179771817d89', 'Amber Glow Body Mist', 'amber-glow-body-mist', 'Beauty', 'A light body-mist concept for a refreshing fragrance layer.', 11000, null, false, 21, 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=85'), true, 11, 'default'),
  ('82077bf3-43ec-502e-b277-e1d3291ed356', 'The Solis Sunglasses', 'the-solis-sunglasses', 'Glasses', 'Classic sunglasses with a versatile, timeless silhouette.', 28500, null, false, 10, 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85'), true, 12, 'default'),
  ('55914028-9d6f-5ffe-acc4-d25f6f46bba5', 'Muse Oversized Frames', 'muse-oversized-frames', 'Glasses', 'Bold oversized frames designed to make a statement.', 32000, null, false, 6, 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=85'), true, 13, 'default'),
  ('4c39ef12-6bec-5c25-ac09-951c819f8000', 'The Amara Cat-Eye', 'the-amara-cat-eye', 'Glasses', 'Elegant cat-eye frames with a playful, polished silhouette.', 26500, null, false, 13, 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=900&q=85'), true, 14, 'default'),
  ('d16817b0-09dc-5569-bc88-4f445d8e26e7', 'Everyday Optical Frames', 'everyday-optical-frames', 'Glasses', 'Minimal everyday frames for a clean, versatile look.', 24000, null, false, 15, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=900&q=85'), true, 15, 'default')
on conflict (id) do nothing;

insert into public.product_media (product_id, kind, public_url, sort_order, is_primary)
select v.pid::uuid, v.kind, v.url, v.ord, v.prim from (values
  ('cddcf0f7-9a83-566b-ac5f-b95b4e959bed', 'image', 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?auto=format&fit=crop&w=900&q=85', 0, true),
  ('4aa8834f-a96d-5d29-a303-44fea86742b6', 'image', 'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?auto=format&fit=crop&w=900&q=85', 0, true),
  ('0246c587-ce92-5cf6-ab59-1dd8fafd9839', 'image', 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?auto=format&fit=crop&w=900&q=85', 0, true),
  ('9c53bad6-2d75-5a47-b690-ec19353115e2', 'image', 'https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=900&q=85', 0, true),
  ('cbed0ec6-6678-576f-9835-cb0d547726a9', 'image', 'https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=900&q=85', 0, true),
  ('f73ac390-be40-51af-8581-67869336f7b8', 'image', 'https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=900&q=85', 0, true),
  ('39a4caec-9488-53bb-8a5f-c43eefd68dbe', 'image', 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=900&q=85', 0, true),
  ('43c52a7e-8dd9-5c3c-a0b2-490065f7b28c', 'image', 'https://images.unsplash.com/photo-1590736969955-71cc94901144?auto=format&fit=crop&w=900&q=85', 0, true),
  ('bbb32a22-b2db-5a76-a407-51f5ddcb9a48', 'image', 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=900&q=85', 0, true),
  ('bc4bbcbd-1ebb-59f8-9daa-a3267771c5d2', 'image', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=900&q=85', 0, true),
  ('c1da6b47-70c4-5fff-8695-1ca438c79bee', 'image', 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=900&q=85', 0, true),
  ('bda9d46b-4069-5e44-acc2-179771817d89', 'image', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=900&q=85', 0, true),
  ('82077bf3-43ec-502e-b277-e1d3291ed356', 'image', 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=900&q=85', 0, true),
  ('55914028-9d6f-5ffe-acc4-d25f6f46bba5', 'image', 'https://images.unsplash.com/photo-1574258495973-f010dfbb5371?auto=format&fit=crop&w=900&q=85', 0, true),
  ('4c39ef12-6bec-5c25-ac09-951c819f8000', 'image', 'https://images.unsplash.com/photo-1577803645773-f96470509666?auto=format&fit=crop&w=900&q=85', 0, true),
  ('d16817b0-09dc-5569-bc88-4f445d8e26e7', 'image', 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=900&q=85', 0, true)
) as v(pid, kind, url, ord, prim)
where not exists (select 1 from public.product_media m where m.product_id = v.pid::uuid)
on conflict do nothing;

-- "Your Next Favourite": the first four products, as the storefront showed before it became editable.
insert into public.merch_slots (section, product_id, position)
select 'next_favourite', id, (row_number() over (order by sort_order) - 1)::int
  from (select id, sort_order from public.products where published and recommendation_eligible order by sort_order limit 4) t
on conflict do nothing;
