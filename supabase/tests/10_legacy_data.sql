-- Simulates an EXISTING production database before the upgrade: rows created by the old admin/schema.
insert into public.products (id, name, category, description, price, sale_price, stock, image_url, image_urls, published)
values
 ('11111111-1111-1111-1111-111111111111','Velvet Glow Moisturizer','Skincare','desc',22000,19500,12,'https://example.supabase.co/storage/v1/object/public/product-images/1700000-velvet.jpg','["https://example.supabase.co/storage/v1/object/public/product-images/1700000-velvet.jpg","https://example.com/other.jpg"]',true),
 ('22222222-2222-2222-2222-222222222222','Velvet Glow Moisturizer','Skincare','dup name',9000,null,0,null,'[]',false),
 ('33333333-3333-3333-3333-333333333333','Odd – Name!!','Beauty','',5000,6000,4,'https://images.unsplash.com/x','[]',true);
