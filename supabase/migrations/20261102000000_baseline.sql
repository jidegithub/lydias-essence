-- Baseline: the tables the project already used (products, store_settings).
-- Safe on an existing database: everything is "if not exists" and no data is touched.

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'Other',
  description text not null default '',
  specifications jsonb not null default '{}'::jsonb,
  price numeric(10,2) not null default 0 check (price >= 0),
  sale_price numeric(10,2) check (sale_price is null or sale_price >= 0),
  stock integer not null default 0 check (stock >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  image_url text,
  image_urls jsonb not null default '[]'::jsonb,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'Lydia''s Essence',
  whatsapp_number text not null default '',
  low_stock_threshold integer not null default 5,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.store_settings enable row level security;

insert into public.store_settings (id, store_name) values (1, 'Lydia''s Essence') on conflict (id) do nothing;
