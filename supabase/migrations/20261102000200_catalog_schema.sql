-- Catalogue upgrade: pricing/discount controls, product media, merchandising sections,
-- and editable website settings. Additive only: existing columns and rows are preserved.

-- ---------------------------------------------------------------- products
alter table public.products
  add column if not exists slug text,
  add column if not exists discount_enabled boolean,
  add column if not exists discount_starts_at timestamptz,
  add column if not exists discount_ends_at timestamptz,
  add column if not exists background_theme text not null default 'default',
  add column if not exists is_featured boolean not null default false,
  add column if not exists recommendation_eligible boolean not null default true,
  add column if not exists has_360 boolean not null default false,
  add column if not exists sort_order integer not null default 0,
  add column if not exists published_at timestamptz;

-- Rows that already had a sale price keep showing it (only if it is a real reduction).
update public.products
   set discount_enabled = (sale_price is not null and sale_price < price)
 where discount_enabled is null;
alter table public.products alter column discount_enabled set default false;
alter table public.products alter column discount_enabled set not null;

-- Friendly, unique web addresses for existing products.
with base as (
  select id, created_at,
         coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'product') as b
    from public.products
   where slug is null or slug = ''
), ranked as (
  select id, b, row_number() over (partition by b order by created_at, id) as rn from base
)
update public.products p
   set slug = case when r.rn = 1 then r.b else r.b || '-' || substr(p.id::text, 1, 6) end
  from ranked r
 where p.id = r.id;
alter table public.products alter column slug set not null;
create unique index if not exists products_slug_key on public.products (slug);

update public.products set published_at = created_at where published and published_at is null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_discount_valid') then
    alter table public.products add constraint products_discount_valid
      check (not discount_enabled or (sale_price is not null and sale_price < price)) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_discount_window') then
    alter table public.products add constraint products_discount_window
      check (discount_starts_at is null or discount_ends_at is null or discount_ends_at > discount_starts_at) not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_slug_format') then
    alter table public.products add constraint products_slug_format
      check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$') not valid;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_theme_valid') then
    alter table public.products add constraint products_theme_valid
      check (background_theme in ('default','blush','sage','sand','stone'));
  end if;
end $$;

create index if not exists products_catalog_idx on public.products (published, sort_order, created_at desc);
create index if not exists products_updated_idx on public.products (updated_at desc);
create index if not exists products_category_idx on public.products (category);

-- ---------------------------------------------------------------- product media
create table if not exists public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  kind text not null default 'image' check (kind in ('image', 'frame_360')),
  storage_path text,                    -- null for externally hosted (legacy/sample) images
  public_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_primary boolean not null default false,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  constraint product_media_primary_is_image check (not is_primary or kind = 'image')
);
create index if not exists product_media_product_idx on public.product_media (product_id, kind, sort_order);
create unique index if not exists product_media_one_primary on public.product_media (product_id) where is_primary;
-- One owner per stored file: deleting one product's image can never remove another product's.
create unique index if not exists product_media_storage_path_key on public.product_media (storage_path) where storage_path is not null;

-- Bring existing single/gallery image URLs into the media table (runs before the sync trigger exists,
-- so it does not touch products.updated_at).
insert into public.product_media (product_id, kind, storage_path, public_url, sort_order, is_primary)
select p.id, 'image',
       case when p.image_url like '%/storage/v1/object/public/product-images/%'
            then split_part(split_part(p.image_url, '/storage/v1/object/public/product-images/', 2), '?', 1) end,
       p.image_url, 0, true
  from public.products p
 where p.image_url is not null and p.image_url <> ''
   and not exists (select 1 from public.product_media m where m.product_id = p.id)
on conflict do nothing;

insert into public.product_media (product_id, kind, storage_path, public_url, sort_order, is_primary)
select p.id, 'image',
       case when u.url like '%/storage/v1/object/public/product-images/%'
            then split_part(split_part(u.url, '/storage/v1/object/public/product-images/', 2), '?', 1) end,
       u.url, u.ord::int, false
  from public.products p
 cross join lateral jsonb_array_elements_text(p.image_urls) with ordinality as u(url, ord)
 where jsonb_typeof(p.image_urls) = 'array'
   and u.url <> '' and u.url is distinct from p.image_url
   and not exists (select 1 from public.product_media m where m.product_id = p.id and m.public_url = u.url)
on conflict do nothing;

-- Keep the columns the storefront already reads (image_url, image_urls) in step with the media table.
create or replace function public.sync_product_media()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pid uuid := coalesce(new.product_id, old.product_id);
begin
  update public.products p
     set image_url = (select m.public_url from public.product_media m
                       where m.product_id = pid and m.kind = 'image'
                       order by m.is_primary desc, m.sort_order asc, m.created_at asc limit 1),
         image_urls = coalesce((select jsonb_agg(m.public_url order by m.sort_order, m.created_at)
                                  from public.product_media m
                                 where m.product_id = pid and m.kind = 'image'), '[]'::jsonb),
         has_360 = exists (select 1 from public.product_media m where m.product_id = pid and m.kind = 'frame_360')
   where p.id = pid;
  return null;
end;
$$;

drop trigger if exists product_media_sync on public.product_media;
create trigger product_media_sync
  after insert or update or delete on public.product_media
  for each row execute function public.sync_product_media();

-- ---------------------------------------------------------------- product triggers
create or replace function public.products_set_published_at()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.published then new.published_at = coalesce(new.published_at, now()); else new.published_at = null; end if;
  elsif new.published and not old.published then
    new.published_at = now();
  elsif not new.published then
    new.published_at = null;
  end if;
  return new;
end;
$$;

drop trigger if exists products_published_at on public.products;
create trigger products_published_at
  before insert or update on public.products
  for each row execute function public.products_set_published_at();

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- merchandising sections
create table if not exists public.merch_slots (
  id uuid primary key default gen_random_uuid(),
  section text not null check (section in ('beauty_rules', 'next_favourite')),
  product_id uuid not null references public.products (id) on delete cascade,
  position integer not null check (position >= 0),
  created_at timestamptz not null default now(),
  constraint merch_slots_next_favourite_range check (section <> 'next_favourite' or position between 0 and 3),
  constraint merch_slots_beauty_rules_range check (section <> 'beauty_rules' or position between 0 and 7),
  constraint merch_slots_unique_product unique (section, product_id),
  constraint merch_slots_unique_position unique (section, position)
);
create index if not exists merch_slots_section_idx on public.merch_slots (section, position);

-- ---------------------------------------------------------------- website settings
alter table public.store_settings
  add column if not exists logo_url text,
  add column if not exists contact_email text not null default '',
  add column if not exists contact_phone text not null default '',
  add column if not exists instagram_url text not null default '',
  add column if not exists facebook_url text not null default '',
  add column if not exists tiktok_url text not null default '',
  add column if not exists announcement_enabled boolean not null default false,
  add column if not exists announcement_text text not null default '',
  add column if not exists show_discount_badge boolean not null default true,
  add column if not exists content jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'store_settings_announcement_len') then
    alter table public.store_settings add constraint store_settings_announcement_len check (char_length(announcement_text) <= 240);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'store_settings_announcement_needs_text') then
    alter table public.store_settings add constraint store_settings_announcement_needs_text
      check (not announcement_enabled or char_length(btrim(announcement_text)) > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'store_settings_content_is_object') then
    alter table public.store_settings add constraint store_settings_content_is_object check (jsonb_typeof(content) = 'object');
  end if;
end $$;

drop trigger if exists store_settings_set_updated_at on public.store_settings;
create trigger store_settings_set_updated_at
  before update on public.store_settings
  for each row execute function public.set_updated_at();

insert into public.store_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------- admin-only functions
-- Both run as the caller (security invoker), so Row Level Security still applies,
-- and both check is_admin() explicitly as a second line of defence.

create or replace function public.merge_site_content(p_patch jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  cur jsonb;
  k text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change website content.' using errcode = '42501';
  end if;
  if jsonb_typeof(p_patch) is distinct from 'object' then
    raise exception 'The content update was not valid.' using errcode = 'P0001';
  end if;

  insert into public.store_settings (id) values (1) on conflict (id) do nothing;
  select content into cur from public.store_settings where id = 1 for update;
  cur := coalesce(cur, '{}'::jsonb);

  -- Merge one level deep so saving a section's wording never wipes its on/off switch.
  for k in select jsonb_object_keys(p_patch) loop
    if jsonb_typeof(p_patch -> k) = 'object' then
      cur := jsonb_set(cur, array[k], coalesce(cur -> k, '{}'::jsonb) || (p_patch -> k), true);
    else
      cur := jsonb_set(cur, array[k], p_patch -> k, true);
    end if;
  end loop;

  update public.store_settings set content = cur where id = 1;
end;
$$;

create or replace function public.save_merch_section(p_section text, p_product_ids uuid[], p_enabled boolean)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  n int := coalesce(cardinality(p_product_ids), 0);
  content_key text;
begin
  if not public.is_admin() then
    raise exception 'Only administrators can change featured products.' using errcode = '42501';
  end if;
  if p_section not in ('beauty_rules', 'next_favourite') then
    raise exception 'Unknown section.' using errcode = 'P0001';
  end if;
  if n <> (select count(distinct t.pid) from unnest(p_product_ids) as t(pid)) then
    raise exception 'Each product can only be chosen once.' using errcode = 'P0001';
  end if;

  if p_section = 'next_favourite' then
    if n > 4 then
      raise exception 'Choose at most four products for Your Next Favourite.' using errcode = 'P0001';
    end if;
    if p_enabled and n <> 4 then
      raise exception 'Your Next Favourite needs exactly four products before it can be shown.' using errcode = 'P0001';
    end if;
    if p_enabled and exists (
      select 1 from unnest(p_product_ids) as t(pid)
      left join public.products p on p.id = t.pid
      where p.id is null or not p.published or not p.recommendation_eligible
    ) then
      raise exception 'All four products must be published and allowed in recommendations.' using errcode = 'P0001';
    end if;
  elsif n > 8 then
    raise exception 'Choose at most eight products for Your Beauty, Your Rules.' using errcode = 'P0001';
  end if;

  delete from public.merch_slots where section = p_section;
  insert into public.merch_slots (section, product_id, position)
  select p_section, t.pid, (t.ord - 1)::int
    from unnest(p_product_ids) with ordinality as t(pid, ord);

  content_key := case p_section when 'beauty_rules' then 'beautyRules' else 'nextFavourite' end;
  insert into public.store_settings (id) values (1) on conflict (id) do nothing;
  update public.store_settings
     set content = jsonb_set(content, array[content_key],
                             coalesce(content -> content_key, '{}'::jsonb) || jsonb_build_object('enabled', p_enabled), true)
   where id = 1;
end;
$$;

revoke all on function public.merge_site_content(jsonb) from public, anon;
revoke all on function public.save_merch_section(text, uuid[], boolean) from public, anon;
grant execute on function public.merge_site_content(jsonb) to authenticated;
grant execute on function public.save_merch_section(text, uuid[], boolean) to authenticated;
