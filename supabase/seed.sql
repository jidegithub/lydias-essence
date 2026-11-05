-- Development seed data: sample products for the shop (jewellery, perfumes, beauty, glasses, home scents).
-- Safe to re-run. For a REAL shop, add products through the admin dashboard instead
-- (run this file only if you want demo products as a starting point).
-- Contains no passwords, keys or personal data.

insert into public.products
  (id, name, slug, category, description, price, sale_price, discount_enabled, stock, image_url, image_urls, published, sort_order, background_theme)
values
  ('14e43201-677d-50c5-bd07-5e4682293bc0', 'Golden Hour Hoops', 'golden-hour-hoops', 'Jewellery', 'Light, polished hoop earrings that go from morning to evening.', 24000, null, false, 14, null, '[]'::jsonb, true, 0, 'blush'),
  ('9f572925-5069-5038-8f6e-ceca475478aa', 'Solstice Pendant Necklace', 'solstice-pendant-necklace', 'Jewellery', 'A delicate pendant on a fine chain, made for layering.', 36500, 31000, true, 8, null, '[]'::jsonb, true, 1, 'sage'),
  ('15aa50bd-7ca0-54b9-87cb-c2d1838f7fcc', 'Stacked Ring Set', 'stacked-ring-set', 'Jewellery', 'Three slim rings designed to be worn together or apart.', 18000, null, false, 20, null, '[]'::jsonb, true, 2, 'sand'),
  ('be9ba13b-2846-59ac-9bb7-c02aad6a84c9', 'Pearl Drop Earrings', 'pearl-drop-earrings', 'Jewellery', 'Soft, luminous drops for a quietly elegant look.', 28500, null, false, 11, null, '[]'::jsonb, true, 3, 'stone'),
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
  ('d16817b0-09dc-5569-bc88-4f445d8e26e7', 'Everyday Optical Frames', 'everyday-optical-frames', 'Glasses', 'Minimal everyday frames for a clean, versatile look.', 24000, null, false, 15, 'https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=900&q=85', jsonb_build_array('https://images.unsplash.com/photo-1508296695146-257a814070b4?auto=format&fit=crop&w=900&q=85'), true, 15, 'default'),
  ('bcee0e29-c7d9-5b15-b007-c42be0012a83', 'Amber Reed Diffuser', 'amber-reed-diffuser', 'Home Scents', 'A slow-release reed diffuser with warm amber notes for any room.', 21000, null, false, 16, null, '[]'::jsonb, true, 16, 'sage'),
  ('27fc8841-212d-526e-8e6a-5704e25e136f', 'Linen & Sage Room Diffuser', 'linen-sage-room-diffuser', 'Home Scents', 'A fresh, airy scent that makes a space feel instantly calm.', 19500, null, false, 12, null, '[]'::jsonb, true, 17, 'sand'),
  ('91d1375b-2b21-5b5c-a411-93d3ad1dd7d4', 'Fig Leaf Ultrasonic Diffuser', 'fig-leaf-ultrasonic-diffuser', 'Home Scents', 'A quiet electric diffuser with a soft glow and a green, creamy fig scent.', 32000, 27000, true, 6, null, '[]'::jsonb, true, 18, 'stone'),
  ('585263a2-a606-5001-8684-f2087c5dfbb4', 'Cedar Mist Diffuser', 'cedar-mist-diffuser', 'Home Scents', 'Woody, comforting and made for evenings in.', 23500, null, false, 9, null, '[]'::jsonb, true, 19, 'default')
on conflict (id) do nothing;

insert into public.product_media (product_id, kind, public_url, sort_order, is_primary)
select v.pid::uuid, v.kind, v.url, v.ord, v.prim from (values
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
