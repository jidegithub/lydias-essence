-- Row Level Security: the public can READ published content; only administrators can WRITE.
-- Replaces the earlier "any signed-in user may manage products" policies.

-- Remove the old policies (names from the original schema file).
drop policy if exists "Public read published products" on public.products;
drop policy if exists "Authenticated manage products" on public.products;
drop policy if exists "Authenticated read settings" on public.store_settings;
drop policy if exists "Authenticated manage settings" on public.store_settings;

-- products ------------------------------------------------------------
drop policy if exists "Public can read published products" on public.products;
drop policy if exists "Admins can read all products" on public.products;
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;

create policy "Public can read published products" on public.products
  for select to anon, authenticated using (published = true);
create policy "Admins can read all products" on public.products
  for select to authenticated using (public.is_admin());
create policy "Admins can insert products" on public.products
  for insert to authenticated with check (public.is_admin());
create policy "Admins can update products" on public.products
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete products" on public.products
  for delete to authenticated using (public.is_admin());

-- product_media -------------------------------------------------------
alter table public.product_media enable row level security;
drop policy if exists "Public can read media of published products" on public.product_media;
drop policy if exists "Admins can insert media" on public.product_media;
drop policy if exists "Admins can update media" on public.product_media;
drop policy if exists "Admins can delete media" on public.product_media;

create policy "Public can read media of published products" on public.product_media
  for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.products p where p.id = product_media.product_id and p.published));
create policy "Admins can insert media" on public.product_media
  for insert to authenticated with check (public.is_admin());
create policy "Admins can update media" on public.product_media
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete media" on public.product_media
  for delete to authenticated using (public.is_admin());

-- merch_slots ---------------------------------------------------------
alter table public.merch_slots enable row level security;
drop policy if exists "Public can read slots of published products" on public.merch_slots;
drop policy if exists "Admins can insert slots" on public.merch_slots;
drop policy if exists "Admins can update slots" on public.merch_slots;
drop policy if exists "Admins can delete slots" on public.merch_slots;

create policy "Public can read slots of published products" on public.merch_slots
  for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.products p where p.id = merch_slots.product_id and p.published));
create policy "Admins can insert slots" on public.merch_slots
  for insert to authenticated with check (public.is_admin());
create policy "Admins can update slots" on public.merch_slots
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "Admins can delete slots" on public.merch_slots
  for delete to authenticated using (public.is_admin());

-- store_settings ------------------------------------------------------
-- Everything in this table is meant to be public (it renders on the storefront).
drop policy if exists "Public can read site settings" on public.store_settings;
drop policy if exists "Admins can insert site settings" on public.store_settings;
drop policy if exists "Admins can update site settings" on public.store_settings;

create policy "Public can read site settings" on public.store_settings
  for select to anon, authenticated using (true);
create policy "Admins can insert site settings" on public.store_settings
  for insert to authenticated with check (public.is_admin());
create policy "Admins can update site settings" on public.store_settings
  for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- No delete policy: the settings row can never be deleted from the API.

-- Defence in depth: visitors can never write, and TRUNCATE (which RLS does not cover) is revoked.
revoke insert, update, delete, truncate, references, trigger on
  public.products, public.product_media, public.merch_slots, public.store_settings from anon;
revoke truncate, references, trigger on
  public.products, public.product_media, public.merch_slots, public.store_settings from authenticated;
