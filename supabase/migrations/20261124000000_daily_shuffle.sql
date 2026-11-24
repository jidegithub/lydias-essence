-- Daily shuffle settings for the storefront "Featured" order.
-- Run this BEFORE deploying the storefront or admin that read these columns.

alter table public.store_settings
  add column if not exists shuffle_enabled boolean not null default false,
  add column if not exists shuffle_categories text[] not null default '{}',
  add column if not exists shuffle_skip_sold_out boolean not null default true,
  add column if not exists shuffle_pinned_ids uuid[] not null default '{}',
  add column if not exists shuffle_seed integer not null default 0,
  add column if not exists shuffle_updated_at timestamptz;

alter table public.store_settings drop constraint if exists shuffle_pinned_max;
alter table public.store_settings add constraint shuffle_pinned_max
  check (cardinality(shuffle_pinned_ids) <= 6);

alter table public.store_settings drop constraint if exists shuffle_categories_valid;
alter table public.store_settings add constraint shuffle_categories_valid
  check (shuffle_categories <@ array['Jewellery', 'Perfumes', 'Beauty', 'Glasses', 'Home Scents']::text[]);
