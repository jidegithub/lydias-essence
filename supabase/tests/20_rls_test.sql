-- RLS / authorization tests. Run on a LOCAL scratch database after:
--   00_local_stubs.sql, all migrations, (optionally 10_legacy_data.sql)
-- Every check prints PASS, or raises an exception (FAIL) and stops.
\set ON_ERROR_STOP on
\set admin_id '''aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'''
\set user_id  '''bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'''

reset role;
drop schema if exists tst cascade;
create schema tst;
grant usage on schema tst to public;

create function tst.expect_error(p_label text, p_sql text, p_state text default null) returns void language plpgsql as $$
begin
  begin
    execute p_sql;
  exception when others then
    if p_state is not null and sqlstate <> p_state then
      raise exception 'FAIL [%]: expected SQLSTATE %, got % (%)', p_label, p_state, sqlstate, sqlerrm;
    end if;
    raise notice 'PASS: % -> %', p_label, sqlerrm;
    return;
  end;
  raise exception 'FAIL [%]: statement unexpectedly succeeded', p_label;
end $$;

create function tst.expect_affected(p_label text, p_sql text, p_expected int) returns void language plpgsql as $$
declare n int;
begin
  execute p_sql;
  get diagnostics n = row_count;
  if n <> p_expected then raise exception 'FAIL [%]: expected % affected rows, got %', p_label, p_expected, n; end if;
  raise notice 'PASS: % (% rows)', p_label, n;
end $$;

create function tst.expect_count(p_label text, p_sql text, p_expected bigint) returns void language plpgsql as $$
declare c bigint;
begin
  execute 'select count(*) from (' || p_sql || ') s' into c;
  if c <> p_expected then raise exception 'FAIL [%]: expected % rows, got %', p_label, p_expected, c; end if;
  raise notice 'PASS: % (% rows)', p_label, c;
end $$;
create function tst.expect_bool(p_label text, p_actual boolean, p_expected boolean) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then raise exception 'FAIL [%]: expected %, got %', p_label, p_expected, p_actual; end if;
  raise notice 'PASS: %', p_label;
end $$;
grant execute on all functions in schema tst to public;

-- fixtures (as superuser) ------------------------------------------------
delete from public.merch_slots; delete from public.product_media; delete from public.products;
delete from storage.objects; delete from public.admin_users; delete from auth.users;
insert into auth.users (id, email) values (:admin_id, 'owner@example.com'), (:user_id, 'stranger@example.com');
insert into public.admin_users (user_id, email) values (:admin_id, 'owner@example.com');
insert into public.products (id, name, slug, category, price, stock, published) values
  ('00000000-0000-0000-0000-000000000001','Pub One','pub-one','Jewellery',1000,5,true),
  ('00000000-0000-0000-0000-000000000002','Pub Two','pub-two','Jewellery',2000,5,true),
  ('00000000-0000-0000-0000-000000000003','Pub Three','pub-three','Beauty',3000,5,true),
  ('00000000-0000-0000-0000-000000000004','Pub Four','pub-four','Glasses',4000,5,true),
  ('00000000-0000-0000-0000-000000000005','Draft Five','draft-five','Perfumes',5000,5,false);
insert into public.product_media (product_id, kind, storage_path, public_url, sort_order, is_primary) values
  ('00000000-0000-0000-0000-000000000001','image','p1/a.jpg','https://x/p1/a.jpg',0,true),
  ('00000000-0000-0000-0000-000000000005','image','p5/a.jpg','https://x/p5/a.jpg',0,true);

\echo
\echo === is_admin() ===
set role anon;
select set_config('request.jwt.claim.sub', '', false);
select tst.expect_bool('anon is not admin', public.is_admin(), false);
set role authenticated;
select set_config('request.jwt.claim.sub', :user_id, false);
select tst.expect_bool('signed-in stranger is not admin', public.is_admin(), false);
select set_config('request.jwt.claim.sub', :admin_id, false);
select tst.expect_bool('owner is admin', public.is_admin(), true);

\echo
\echo === anonymous visitor ===
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select tst.expect_count('anon sees only published products', 'select 1 from public.products', 4);
select tst.expect_count('anon cannot see draft by id', $$select 1 from public.products where id='00000000-0000-0000-0000-000000000005'$$, 0);
select tst.expect_count('anon sees media of published products only', 'select 1 from public.product_media', 1);
select tst.expect_count('anon can read site settings', 'select 1 from public.store_settings', 1);
select tst.expect_error('anon cannot insert product', $$insert into public.products (name, slug, price) values ('x','x',1)$$);
select tst.expect_error('anon cannot update product', $$update public.products set price = 1$$);
select tst.expect_error('anon cannot delete product', $$delete from public.products$$);
select tst.expect_error('anon cannot update settings', $$update public.store_settings set store_name='hacked'$$);
select tst.expect_error('anon cannot truncate', $$truncate public.products$$);
select tst.expect_error('anon cannot call merge_site_content', $$select public.merge_site_content('{"hero":{}}')$$);
select tst.expect_error('anon cannot call save_merch_section', $$select public.save_merch_section('beauty_rules', array[]::uuid[], true)$$);
select tst.expect_error('anon cannot read admin list', 'select 1 from public.admin_users');
select tst.expect_error('anon cannot upload to storage', $$insert into storage.objects (bucket_id, name) values ('product-images','evil.jpg')$$);
select tst.expect_count('anon cannot list storage objects', 'select 1 from storage.objects', 0);

\echo
\echo === signed-in user who is NOT an administrator ===
reset role; set role authenticated; select set_config('request.jwt.claim.sub', :user_id, false);
select tst.expect_count('stranger sees only published products', 'select 1 from public.products', 4);
select tst.expect_error('stranger cannot insert product', $$insert into public.products (name, slug, price) values ('x','x',1)$$, '42501');
select tst.expect_affected('stranger update touches 0 rows', $$update public.products set price = 1$$, 0);
select tst.expect_affected('stranger delete touches 0 rows', $$delete from public.products$$, 0);
select tst.expect_error('stranger cannot insert media', $$insert into public.product_media (product_id, public_url) values ('00000000-0000-0000-0000-000000000001','https://x')$$, '42501');
select tst.expect_affected('stranger cannot update settings', $$update public.store_settings set store_name='hacked'$$, 0);
select tst.expect_error('stranger cannot insert slots', $$insert into public.merch_slots (section, product_id, position) values ('beauty_rules','00000000-0000-0000-0000-000000000001',0)$$, '42501');
select tst.expect_error('stranger cannot call merge_site_content', $$select public.merge_site_content('{"hero":{}}')$$, '42501');
select tst.expect_error('stranger cannot call save_merch_section', $$select public.save_merch_section('beauty_rules', array[]::uuid[], true)$$, '42501');
select tst.expect_error('stranger cannot add themselves as admin', $$insert into public.admin_users (user_id) values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')$$);
select tst.expect_count('stranger sees no admin records', 'select 1 from public.admin_users', 0);
select tst.expect_error('stranger cannot truncate', $$truncate public.products$$);
select tst.expect_error('stranger cannot upload to storage', $$insert into storage.objects (bucket_id, name) values ('product-images','evil.jpg')$$, '42501');
select tst.expect_affected('stranger cannot delete storage objects', $$delete from storage.objects$$, 0);

\echo
\echo === administrator ===
reset role; set role authenticated; select set_config('request.jwt.claim.sub', :admin_id, false);
select tst.expect_count('admin sees drafts too', 'select 1 from public.products', 5);
select tst.expect_count('admin sees all media', 'select 1 from public.product_media', 2);
select tst.expect_count('admin sees own admin record only', 'select 1 from public.admin_users', 1);
select tst.expect_affected('admin can insert product', $$insert into public.products (name, slug, price, stock, published) values ('New','new-item',1500,3,false)$$, 1);
select tst.expect_affected('admin can update product', $$update public.products set price = 1200 where slug='new-item'$$, 1);
select tst.expect_error('discount cannot be enabled with sale >= price', $$update public.products set discount_enabled=true, sale_price=5000 where slug='new-item'$$, '23514');
select tst.expect_affected('valid discount accepted', $$update public.products set discount_enabled=true, sale_price=900 where slug='new-item'$$, 1);
select tst.expect_affected('disabling discount keeps the saved sale price', $$update public.products set discount_enabled=false where slug='new-item' and sale_price=900$$, 1);
select tst.expect_error('end date must be after start', $$update public.products set discount_starts_at=now(), discount_ends_at=now()-interval '1 day' where slug='new-item'$$, '23514');
select tst.expect_error('duplicate slug rejected', $$insert into public.products (name, slug, price) values ('Dup','pub-one',1)$$, '23505');
select tst.expect_error('bad slug rejected', $$insert into public.products (name, slug, price) values ('Bad','Bad Slug!',1)$$, '23514');
select tst.expect_error('bad theme rejected', $$update public.products set background_theme='neon' where slug='new-item'$$, '23514');
select tst.expect_affected('publishing sets published_at', $$update public.products set published=true where slug='new-item' and published_at is null$$, 1);
select tst.expect_affected('published_at is set', $$update public.products set stock=stock where slug='new-item' and published_at is not null$$, 1);

\echo --- media sync trigger
select tst.expect_affected('admin adds 2nd image', $$insert into public.product_media (product_id, kind, storage_path, public_url, sort_order) values ('00000000-0000-0000-0000-000000000001','image','p1/b.jpg','https://x/p1/b.jpg',1)$$, 1);
select tst.expect_count('image_urls has both images', $$select 1 from public.products where id='00000000-0000-0000-0000-000000000001' and jsonb_array_length(image_urls)=2 and image_url='https://x/p1/a.jpg'$$, 1);
select tst.expect_error('only one primary image per product', $$update public.product_media set is_primary=true where storage_path='p1/b.jpg'$$, '23505');
select tst.expect_error('frames cannot be primary', $$insert into public.product_media (product_id, kind, public_url, is_primary) values ('00000000-0000-0000-0000-000000000001','frame_360','https://x/f',true)$$, '23514');
select tst.expect_error('a file can belong to only one product', $$insert into public.product_media (product_id, storage_path, public_url) values ('00000000-0000-0000-0000-000000000002','p1/a.jpg','https://x/dupe')$$, '23505');
select tst.expect_affected('admin adds 360 frames', $$insert into public.product_media (product_id, kind, storage_path, public_url, sort_order) select '00000000-0000-0000-0000-000000000001','frame_360','p1/f'||g||'.jpg','https://x/f'||g, g from generate_series(0,7) g$$, 8);
select tst.expect_count('has_360 flag set, gallery unchanged', $$select 1 from public.products where id='00000000-0000-0000-0000-000000000001' and has_360 and jsonb_array_length(image_urls)=2$$, 1);
select tst.expect_affected('admin removes primary: next image takes over', $$delete from public.product_media where storage_path='p1/a.jpg'$$, 1);
select tst.expect_count('image_url falls back to remaining image', $$select 1 from public.products where id='00000000-0000-0000-0000-000000000001' and image_url='https://x/p1/b.jpg'$$, 1);

\echo --- merchandising functions
select tst.expect_error('4-product section needs exactly four when enabled', $$select public.save_merch_section('next_favourite', array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003']::uuid[], true)$$, 'P0001');
select tst.expect_error('draft product cannot be in an enabled 4-product section', $$select public.save_merch_section('next_favourite', array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000005']::uuid[], true)$$, 'P0001');
select tst.expect_error('more than four rejected', $$select public.save_merch_section('next_favourite', array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000005']::uuid[], false)$$, 'P0001');
select tst.expect_error('duplicate product rejected', $$select public.save_merch_section('next_favourite', array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000001']::uuid[], false)$$, 'P0001');
select tst.expect_error('unknown section rejected', $$select public.save_merch_section('hero', array[]::uuid[], true)$$, 'P0001');
select tst.expect_affected('four valid products can be saved and enabled', $$select public.save_merch_section('next_favourite', array['00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001']::uuid[], true)$$, 1);
select tst.expect_count('order is stored (position 0 = Pub Four)', $$select 1 from public.merch_slots where section='next_favourite' and position=0 and product_id='00000000-0000-0000-0000-000000000004'$$, 1);
select tst.expect_count('enabled flag stored in content', $$select 1 from public.store_settings where content #>> '{nextFavourite,enabled}' = 'true'$$, 1);
select tst.expect_affected('reordering replaces the set', $$select public.save_merch_section('next_favourite', array['00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-000000000004']::uuid[], true)$$, 1);
select tst.expect_count('still exactly four rows', $$select 1 from public.merch_slots where section='next_favourite'$$, 4);
select tst.expect_affected('beauty rules accepts a partial selection', $$select public.save_merch_section('beauty_rules', array['00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000001']::uuid[], true)$$, 1);

\echo --- site content
select tst.expect_affected('merge_site_content saves hero copy', $$select public.merge_site_content('{"beautyRules":{"headingLine1":"Custom heading."}}')$$, 1);
select tst.expect_count('merge keeps the enabled switch', $$select 1 from public.store_settings where content #>> '{beautyRules,headingLine1}'='Custom heading.' and content #>> '{beautyRules,enabled}'='true'$$, 1);
select tst.expect_error('non-object content rejected', $$select public.merge_site_content('[1,2]')$$, 'P0001');
select tst.expect_affected('admin updates announcement', $$update public.store_settings set announcement_enabled=true, announcement_text='Free delivery this week' where id=1$$, 1);
select tst.expect_error('cannot enable banner with empty text', $$update public.store_settings set announcement_text='' where id=1$$, '23514');
select tst.expect_error('announcement over 240 chars rejected', $$update public.store_settings set announcement_text=repeat('x',241) where id=1$$, '23514');
select tst.expect_affected('settings row cannot be deleted (0 rows match)', $$delete from public.store_settings$$, 0);
select tst.expect_count('settings row still there', 'select 1 from public.store_settings', 1);

\echo --- storage
select tst.expect_affected('admin can upload to product-images', $$insert into storage.objects (bucket_id, name) values ('product-images','p1/new.jpg')$$, 1);
select tst.expect_error('admin cannot write to an unknown bucket', $$insert into storage.objects (bucket_id, name) values ('somewhere-else','x.jpg')$$, '42501');
select tst.expect_count('admin can list objects', 'select 1 from storage.objects', 1);
select tst.expect_affected('admin can delete objects', $$delete from storage.objects where name='p1/new.jpg'$$, 1);

\echo --- cascade
select tst.expect_affected('admin can delete a product', $$delete from public.products where id='00000000-0000-0000-0000-000000000001'$$, 1);
select tst.expect_count('its media rows are gone', $$select 1 from public.product_media where product_id='00000000-0000-0000-0000-000000000001'$$, 0);
select tst.expect_count('its featured slots are gone', $$select 1 from public.merch_slots where product_id='00000000-0000-0000-0000-000000000001'$$, 0);

\echo
\echo === visitor view after admin changes ===
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select tst.expect_count('anon sees announcement text', $$select 1 from public.store_settings where announcement_enabled and announcement_text='Free delivery this week'$$, 1);
select tst.expect_count('anon sees remaining published products only', 'select 1 from public.products', 4);
select tst.expect_count('anon sees remaining slots of published products', $$select 1 from public.merch_slots where section='next_favourite'$$, 3);

reset role;
\echo
\echo ALL RLS CHECKS PASSED
