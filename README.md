# Aurelle Parfums: online perfume shop

Next.js (App Router) + Supabase (Postgres, Auth, Storage) + Vercel. Prices in **MVR** (GST included), built for the Maldives.
See `PRD.md` for the full product requirements.

## What's included
- **Storefront:** home, shop with live search + filters (category, price, size, stock, gender, family, brand) + sorting, product pages with variants and galleries, bag, guest/optional-account checkout, bank-transfer payment page with **receipt upload**, order tracking (order number + phone), customer account.
- **Orders:** Pending → Slip Uploaded → Approved / Rejected → Delivered (plus Cancelled). Stock is reserved atomically when an order is placed and released on rejection / cancellation / expiry.
- **Admin (`/admin`):** stats dashboard with charts, products + variants + images + stock adjustments (with a log), categories, orders with slip review and CSV export, printable invoice, users & roles (Super Admin, Manager, Order Staff, Inventory Staff), customers, store settings, activity log.
- **Images:** product photos are converted in the browser to high-quality WebP (92%, max 2400 px, metadata removed) and stored in Supabase Storage. Receipts are compressed harder (JPEG, max 1600 px) and kept in a **private** bucket.

## 1. Create the Supabase project
1. Create a project at https://supabase.com (free plan is fine).
2. **SQL Editor → New query**: paste the contents of `supabase/migrations/0001_init.sql` and run it. This creates tables, security policies, storage buckets and business functions.
3. (Optional demo data) run `supabase/seed.sql`.
4. **Authentication → Providers → Email**: for v1 turn **off** "Confirm email" (the free plan's built-in email sending is heavily rate-limited), or configure your own SMTP.
5. **Project Settings → API**: copy the Project URL, `anon` key and `service_role` key.

## 2. Run locally
```bash
npm install
cp .env.example .env.local     # then fill in the Supabase values
npm run dev                    # http://localhost:3000
```

## 3. Create the first Super Admin
1. Supabase Dashboard → **Authentication → Users → Add user** (tick "Auto confirm user").
2. In the SQL Editor run (use your email):
   ```sql
   update public.profiles set role = 'super_admin' where email = 'you@example.com';
   ```
3. Sign in at `/admin/login`. From **Users & roles** you can add the rest of the team.
4. Go to **Settings** and enter your bank account details, GST number and Greater Malé areas.

## 4. Deploy to Vercel
1. Push this folder to a GitHub repository and import it in Vercel.
2. **Before the first deploy**, add these environment variables in Vercel → Project → Settings → Environment Variables (all environments): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your live URL) and `CRON_SECRET`. `NEXT_PUBLIC_*` values are baked in at build time, so redeploy after adding or changing them.
3. `vercel.json` registers a daily cron (`/api/cron`) that cancels unpaid orders after the expiry window (default 48 h) and keeps the free Supabase project from pausing. Vercel sends `CRON_SECRET` automatically as a bearer token.

> **Important:** Vercel's free *Hobby* plan is for **non-commercial** use only. It is fine for building and testing, but plan to move to Pro (or another host) before taking real orders.
> The free Supabase plan also has no automatic backups, so export your data regularly.

## Replacing the logo
The logo is a free placeholder (an original SVG bottle + wordmark). To replace it, swap `public/brand/logo.svg` and `src/app/icon.svg`, and change the name in `src/config/site.ts`.

## Project layout
```
supabase/migrations/0001_init.sql   database, RLS, storage, order/stock functions
src/config/site.ts                  brand name, logo path, time zone
src/lib/                            supabase clients, auth/roles, data queries, image compression, cart
src/app/(shop)/                     storefront routes + server actions
src/app/admin/                      admin routes + server actions
src/components/                     UI components (admin ones in components/admin)
```

## Security notes
- Every admin page and action checks the signed-in user's role on the server, and Postgres RLS enforces it again.
- Guests reach their order through an unguessable link token (or order number + phone on `/track`); receipts are never public.
- The service-role key is used only in server code. Never expose it to the browser.
- Rate limiting is basic (in-memory). Add Cloudflare Turnstile / Upstash rate limiting before a public launch.

## Not in v1 (see PRD)
Payment gateway, customer notifications (email/SMS/WhatsApp), discount codes, reviews, manual order creation by staff, CSV product import, DB-synced carts, multi-language.

## Open questions
Still listed at the bottom of `PRD.md` (section 12.3) for the next version.
