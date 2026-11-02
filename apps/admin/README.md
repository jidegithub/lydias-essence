# Lydia's Essence Admin Dashboard

Responsive React + Vite admin dashboard based on the Tasko reference, branded with Lydia's Essence styling.

## Run
1. Install Node.js 20+.
2. Copy `.env.example` to `.env.local` and fill in your Supabase URL and anon key.
3. Run `npm install`, then `npm run dev`.
4. Open the Vite local URL.

## Supabase setup
1. Create a Supabase project and configure `.env.local` using `.env.example`.
2. Run `supabase/schema.sql` in Supabase SQL Editor.
3. Create a Storage bucket named `product-images` and add storage policies.
4. Create/invite your admin account through Supabase Authentication; there is no public admin sign-up form.
5. Before production, replace the example policies with a proper admin allow-list or role-table policy. As written, the example allows any authenticated account to manage product data if public sign-up is enabled. Never expose a service-role key in frontend code.

## Included
- Dashboard metric cards, inventory overview chart, low-stock alerts
- 50 sample products for preview mode
- Product search, filters, add/edit/delete, publish/unpublish, quick stock adjustments
- Product image upload UI (gallery/camera where supported)
- Store and WhatsApp settings screens
- Supabase Auth, products and settings integration
- Responsive mobile navigation and product cards

## Important
Without Supabase environment variables, this is preview mode. Sample data is in memory only and is not persistent or secure. The chart uses illustrative weekly values; it is not historical inventory data. Sales/revenue analytics and multi-frame 360° management need additional real data tables/UI before production.
