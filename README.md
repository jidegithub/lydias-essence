# Lydia’s Essence

A pnpm monorepo: the public **storefront**, the private **admin dashboard** (the shop manager), shared packages, and the Supabase database setup.

```
apps/storefront      public shop (React + Vite)
apps/admin           shop manager for the owner (React + Vite + React Router)
packages/ui          brand theme tokens, toasts, confirmation dialog, 360° viewer
packages/types       shared TypeScript types
packages/utils       pricing rules, price formatting, validation, default website wording
packages/supabase    Supabase client + data access used by both apps
supabase/migrations  the database (tables, security rules, storage)
supabase/seed.sql    optional demo products (development only)
```

> **Status of this delivery:** the admin dashboard and the database/security layer are complete and tested (see *Testing*).
> The storefront has **not** been switched over to read the new settings yet (announcement banner, featured sections, editable
> wording, discounts schedule, 360° viewer). Until it is, changes made in the admin are saved safely in Supabase but won’t show on the public shop.

---

## 1. One-time setup (about 15 minutes)

You need a Supabase project and the user account you already created for the owner.

1. **Apply the database.** Supabase → *SQL Editor*. Paste and run each file in `supabase/migrations/` **in filename order** (5 files).
   Or with the CLI: `supabase link --project-ref <ref> && supabase db push`.
   They are safe on an existing database: nothing is deleted, existing products and prices are kept, and they can be re-run.
2. **Make your existing user the administrator.** Open `supabase/admin-setup.sql`, replace `owner@example.com` with that user’s email,
   paste it into the SQL editor and run it. Until you do, that user can sign in but is told they don’t have admin access.
3. **Turn off public sign-ups.** Supabase → *Authentication → Sign In / Providers → Email* → switch off “Allow new users to sign up”.
   (Even if left on, a new user has **no** admin rights, but there is no reason to allow it.)
4. **Check Storage.** The migrations create two buckets, `product-images` and `site-media` (public to *read*, admin-only to upload/replace/delete,
   5 MB limit, JPG/PNG/WebP/AVIF only). If your project already had policies on those buckets from the old setup, delete any that aren’t the four
   “Admins can …” policies (`supabase/maintenance.sql` has a query that lists them).
5. **Copy two values** from Supabase → *Project Settings → API*: the **Project URL** and the **anon public** key.
   **Never use the `service_role` key anywhere in this project.**

## 2. Run it locally

```bash
pnpm install
cp apps/admin/.env.example apps/admin/.env.local     # then paste your URL and anon key
pnpm dev:admin                                       # http://localhost:5174
```

Sign in with the owner’s email and password (the ones you set in Supabase → Authentication → Users). The password is never stored in this code.

Useful commands: `pnpm typecheck` · `pnpm test` · `pnpm build` (builds both apps).

## 3. Deploy to Netlify

Create **one Netlify site per app**, both from this repository:

| | Storefront | Admin |
|---|---|---|
| Base directory | `apps/storefront` | `apps/admin` |
| Build command / publish dir | from `netlify.toml` (admin ships one; the storefront’s is set in the Netlify UI: `cd ../.. && pnpm install --frozen-lockfile && pnpm --filter @lydias-essence/storefront build`, publish `dist`) | from `apps/admin/netlify.toml` |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_USE_SAMPLE_DATA=false` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

The admin’s `netlify.toml` makes `/products`, `/settings/banner` etc. work on refresh and direct links. Deploy previews work out of the box.
Put the admin on a separate address (e.g. `admin.yourshop.com`). It is marked `noindex`.

## 4. Security model (short version)

* **Who is an admin?** Only users listed in `public.admin_users`. Signing in is not enough. The list can only be edited from the Supabase SQL editor.
* **Enforced in the database, not the screen.** Row Level Security lets the public *read* published products and settings; only admins can write
  products, images, featured sections and settings. Storage uploads/replacements/deletes are admin-only. The visitor role has no write permission at all.
* The apps use only the public anon key. Featured sections are saved by database functions that re-check admin rights and the “exactly four” rule.

## 5. What the owner can do in the dashboard

**Add many products at once** (drop in photos, fill a grid or paste from a spreadsheet, create them all as drafts) · Products (create, edit, duplicate, delete, publish/unpublish, drafts, search/filter/sort, quick price & stock edits, preview) · prices and
discounts (sale price, on/off, optional start/end dates, live preview and % off) · images (multi-upload, main image, reorder, replace, remove)
and optional 360° frame sequences · “Your Beauty, Your Rules” and “Your Next Favourite” (exactly four) selection with reordering and preview ·
announcement banner · brand, contact and social links · homepage wording and images. Every action confirms with a short disappearing message,
risky ones ask first, and leaving a page with unsaved changes warns you.

## 5b. Product categories (one list for everything)

The categories are defined **once**, in `packages/types/src/index.ts` (`PRODUCT_CATEGORIES`). The admin dropdowns, the shop’s filter tabs and the shop’s
header menu all read that one list, and a test (`pnpm test`) fails if anyone hard-codes a category name elsewhere.

Current list: **Jewellery · Perfumes · Beauty · Glasses · Home Scents**.

To add, rename or remove a category later:
1. Edit the list in `packages/types/src/index.ts`.
2. Add a small SQL migration that moves the products already in the old category (copy `supabase/migrations/20261103000000_categories_jewellery_home_scents.sql`).
3. Redeploy the shop and the admin.

Existing “Skincare” products: the migration above **keeps** them and moves them to Beauty. To delete them instead, run `supabase/optional/delete_skincare_products.sql`
(read its three steps first) **before** applying that migration.

## 6. Testing

* `pnpm test` – 25 unit tests (pricing, discounts, validation, uploads, content defaults, and the one-category-list rule).
* `supabase/tests/` – a security test suite (83 checks) for the database and storage rules. It runs on a *scratch local Postgres*
  (`00_local_stubs.sql` stands in for Supabase’s auth/storage schemas, then the migrations, then `20_rls_test.sql`). It is not meant for your real project.
* The admin has also been exercised in a real browser against a simulated Supabase API (login, permissions, uploads, validation, toasts, mobile/tablet layout).
  That does **not** replace a first run against your live Supabase project – see the checklist below.

### First-run checklist on your real project
Sign in → add a product with two images → publish it → duplicate it → delete the copy → choose four “Next Favourite” products → save the banner →
reload each page and confirm everything persisted → sign out and confirm `/products` sends you to the sign-in page.

## 7. Known limitations

* Storefront integration is pending (see the status note at the top).
* 360° support is **image sequences** only (the storefront has no 3D-model viewer; GLB upload is not offered).
* Public image URLs work for anyone who has the link, including images of draft products; file names are random and listing is blocked, but it is not private storage.
* Upload progress is per file (“Uploading 2 of 5”), not a byte-level bar.
* Product editing is last-save-wins if two people edit the same product at once.
* Orphaned files from an interrupted upload are possible but rare; `supabase/maintenance.sql` lists them.
