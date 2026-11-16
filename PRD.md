# Product Requirements Document: Perfume Shopping Site (v1)

| | |
|---|---|
| **Status** | Draft for review |
| **Date** | 2026-11-15 |
| **Stack** | Next.js (App Router), Supabase (Postgres, Auth, Storage), Vercel (free plan) |
| **Market** | Maldives (currency: MVR) |
| **Brand** | Elegant luxury perfume boutique; navy blue palette |

---

## 1. Overview

A single-brand online store for selling perfumes to customers in the Maldives. Visitors browse, search and filter products, add them to a cart, and check out as a guest or with an optional account. Because there is no payment gateway in v1, the customer pays by bank transfer and uploads a payment receipt (slip). Staff review the slip in the admin dashboard and move the order through its lifecycle.

### 1.1 Goals
1. Let customers discover and order perfumes with minimal friction.
2. Give the team a complete admin dashboard to manage products, stock, orders and staff users.
3. Run entirely on free tiers (Vercel, Supabase) for now, with a path to upgrade.
4. Present a premium, elegant brand experience.

### 1.2 Non-Goals (v1)
- Online payment gateway (card, BML/MIB gateways, etc.).
- Automated customer notifications (email, SMS, WhatsApp). Customers use the order tracking page.
- Multi-currency, multi-language (English only), or international shipping.
- Reviews and ratings, wishlists, discount codes and loyalty points. These are candidates for v2.
- Mobile apps.

### 1.3 Success Metrics
- A customer can complete checkout, including slip upload, in under 3 minutes on mobile.
- Staff can process an order (review slip, approve, mark delivered) in under 1 minute.
- Pages score 90+ on Lighthouse performance on mobile (storefront).
- Zero overselling: stock never goes below 0.

---

## 2. Users and Roles

### 2.1 Storefront users
| User | Description |
|---|---|
| Visitor | Browses, searches, filters. No account needed. |
| Guest customer | Places an order with name, phone, address. Tracks it with order number + phone. |
| Registered customer (optional) | Has an account for saved details and order history. |

### 2.2 Admin users (staff)
| Role | Purpose |
|---|---|
| **Super Admin** | Full access, including user management and store settings. |
| **Manager** | Products, categories, orders, stats. No user management or settings. |
| **Order Staff** | View orders, review slips, approve/reject, mark delivered. Read-only on products. |
| **Inventory Staff** | Manage products, variants, stock, categories and images. No order access. |

### 2.3 Permission matrix
| Capability | Super Admin | Manager | Order Staff | Inventory Staff |
|---|:-:|:-:|:-:|:-:|
| View dashboard stats | ✅ | ✅ | Orders stats only | Inventory stats only |
| Create/edit/delete products & variants | ✅ | ✅ | ❌ | ✅ |
| Adjust stock | ✅ | ✅ | ❌ | ✅ |
| Manage categories | ✅ | ✅ | ❌ | ✅ |
| View orders | ✅ | ✅ | ✅ | ❌ |
| Approve/reject slips, change order status | ✅ | ✅ | ✅ | ❌ |
| Delete / cancel orders | ✅ | ✅ | ❌ | ❌ |
| Manage admin users and roles | ✅ | ❌ | ❌ | ❌ |
| Store settings (bank details, delivery, GST) | ✅ | ❌ | ❌ | ❌ |
| View audit log | ✅ | ✅ | ❌ | ❌ |

Rules: only Super Admin can create users or change roles. The last active Super Admin cannot be deleted or demoted. Users can be deactivated (not hard-deleted) to preserve audit history.

---

## 3. Storefront Requirements

### 3.1 Pages
| Page | Route | Notes |
|---|---|---|
| Home | `/` | Hero, featured products, new arrivals, categories, brand story strip |
| Shop / listing | `/shop` | Search, filters, sort, pagination |
| Category | `/category/[slug]` | Listing pre-filtered by category |
| Product detail | `/product/[slug]` | Gallery, variant selector, stock status, description, notes |
| Cart | `/cart` | Edit quantities, see totals |
| Checkout | `/checkout` | Guest or logged-in; delivery details; order summary |
| Payment / upload slip | `/order/[orderNumber]/pay` | Bank details + receipt upload |
| Order tracking | `/track` | Order number + phone number lookup |
| Account (optional) | `/account` | Profile, saved addresses, order history |
| Login / Register | `/login`, `/register` | Email + password via Supabase Auth |
| Static | `/about`, `/contact`, `/delivery-info`, `/privacy`, `/terms` | Simple content pages |

### 3.2 Search and Filters (required)
- **Search:** keyword search across product name, brand, description and fragrance notes. Uses Postgres full-text search (with `pg_trgm` for typo tolerance) and updates results as the user types (debounced). Includes empty-state suggestions.
- **Filters:**
  - Category (multi-select)
  - Price range (MVR, slider)
  - Size/variant (e.g. 30 ml, 50 ml, 100 ml)
  - Availability (in stock only)
  - Gender/target (Men, Women, Unisex)
  - Fragrance family (Woody, Floral, Oriental, Fresh, etc.)
  - Brand
- **Sort:** Newest, Price low→high, Price high→low, Name A–Z.
- **URL state:** filters and search live in the query string so results are shareable and survive refresh.
- **Pagination:** 12–24 products per page (or "load more").

### 3.3 Product Display
- Gallery with multiple images, zoom on hover/tap, and swipe on mobile.
- Variant selector (size). Selecting a variant updates price, SKU and stock status.
- Stock indicators: "In stock", "Only X left" (when stock ≤ threshold, default 5), "Out of stock" (add-to-cart disabled).
- Prices are shown in MVR and **include GST**.
- Details: description, fragrance notes (top/heart/base), brand, gender, family, concentration (EDP/EDT/etc.).

### 3.4 Cart and Checkout
- Cart persists in local storage for guests and in the database for logged-in users, with merge on login.
- Cart validates stock on every change and at checkout.
- **Checkout fields:** full name, phone (required), email (optional), delivery type, address, island/atoll, order notes.
- **Delivery options:**
  - **Greater Malé area** (Malé, Hulhumalé, Villimalé): **free doorstep delivery**.
  - **Islands/atolls:** delivery to the **ferry** (customer picks up at the destination). Customer selects island and ferry/pickup point details. Any ferry-related cost is not charged in the system in v1 (configurable fee field available for later).
- Order summary shows items, subtotal (GST-inclusive), the GST portion, delivery (Free), and total.
- After placing the order, the customer is redirected to the **payment page** with the order number, bank transfer details and a slip upload field.
- The customer can upload the slip right away or come back via `/track` to upload later.

### 3.5 Payment by Receipt Upload
- Store shows bank account details (bank name, account name, account number) from admin settings, plus the exact amount to pay and the order number as the payment reference.
- Upload accepts JPG, PNG, WebP and PDF (PDFs stored as-is, size-limited). Max upload 10 MB before compression.
- On successful upload the status changes from **Pending** to **Slip Uploaded**.
- Customers may replace the slip while the order is Pending or Slip Uploaded.
- If an order is **Rejected**, the customer sees the rejection reason on the tracking page and can upload a new slip, which returns the order to **Slip Uploaded** (open question 12.3).

### 3.6 Order Tracking
- Lookup by order number + phone number (guest) or via account.
- Shows status timeline, items, totals, the slip thumbnail and the rejection reason when applicable.

---

## 4. Order Lifecycle

| Status | Meaning | Who changes it |
|---|---|---|
| **Pending** | Order placed, awaiting payment slip | System (on checkout) |
| **Slip Uploaded** | Customer uploaded a receipt, awaiting review | System (on upload) |
| **Approved** | Payment verified; order being prepared | Order Staff / Manager / Super Admin |
| **Rejected** | Slip invalid or payment not received; includes reason | Order Staff / Manager / Super Admin |
| **Delivered** | Handed to customer / delivered to ferry | Order Staff / Manager / Super Admin |

```
Pending ──upload slip──► Slip Uploaded ──┬─► Approved ──► Delivered
   ▲                                      └─► Rejected ──(re-upload)──► Slip Uploaded
   └──────────── (customer can re-upload while Pending)
```

**Rules**
- Valid transitions are enforced server-side. Delivered is final. Approved cannot go back to Pending.
- **Stock handling:** stock is **reserved (decremented) when the order is placed** (Pending), so two customers cannot buy the last item. Stock is **restored** if the order is Rejected or cancelled by staff, and re-reserved if a Rejected order is revived by a new slip (fails with a clear message if stock is gone).
- **Auto-expiry (recommended):** Pending orders with no slip after a configurable window (default 48 h) are automatically cancelled and stock released. This needs a scheduled job (Vercel Cron on the free plan is limited to daily runs, which is fine).
- Every status change is recorded with user, timestamp and optional note.
- A **Cancelled** internal status is available for staff to void orders (not customer-visible as a main step); see 12.3.

---

## 5. Admin Dashboard Requirements

Route prefix: `/admin`. Separate login at `/admin/login`. Access is limited to users in the admin users table (staff). All admin routes and APIs enforce role permissions server-side and with Supabase RLS.

### 5.1 Dashboard Home (stats)
Date range selector (Today, 7 days, 30 days, This month, Custom) applies to the cards and charts.

**KPI cards:** total revenue (approved + delivered orders, MVR), total orders, orders awaiting review (Slip Uploaded), pending orders, average order value, new customers, delivered orders, rejection rate.

**Charts:**
- Revenue over time (line)
- Orders over time by status (stacked bar)
- Order status distribution (donut)
- Sales by category (bar)
- Top 10 selling products (bar/table)
- Delivery split: Greater Malé vs islands

**Lists and alerts:**
- Orders needing action (Slip Uploaded, oldest first)
- Low stock and out-of-stock variants (below threshold)
- Recent orders
- Recent admin activity

### 5.2 Product Management (full CRUD)
- Product list: table with thumbnail, name, category, price range, total stock, status. Search, filter (category, status, stock), sort, bulk actions (publish/unpublish, delete, change category).
- Create/edit product:
  - Name, slug (auto, editable), brand, description, fragrance notes, gender, family, concentration
  - Category (one primary, optional extras), tags
  - Status: Draft / Published / Archived
  - Featured flag
  - **Variants:** each has label (e.g. 50 ml), SKU, price (MVR), optional compare-at price, stock quantity, active flag; add, edit, remove, reorder
  - **Images:** multi-upload, drag-to-reorder, choose main image, alt text, delete
  - SEO title/description
- Soft delete (archive) by default. Hard delete is blocked if the product appears in orders.
- Stock adjustment with a reason (restock, damaged, correction), stored in a stock movement log.
- CSV import/export of products is a nice-to-have (v1.1).

### 5.3 Category Management
- Create/edit/delete/reorder categories. Optional parent/child. Image and description per category.
- Cannot delete a category with products unless they are reassigned first.

### 5.4 Order Management (full)
- Order list with search (order number, name, phone), filters (status, date range, delivery type), sort, pagination, status badges, and CSV export.
- Order detail: customer info, delivery details, items with variants, totals, status timeline, internal notes.
- **Slip viewer:** large preview/zoom of the receipt, download, replace history.
- Actions: Approve, Reject (reason required), Mark Delivered, Cancel (Manager+), edit delivery details/internal notes, add manual notes.
- Create manual order (for phone/Viber/walk-in orders) — Manager+.
- Printable invoice / packing slip (browser print/PDF) showing GST breakdown.
- Bulk status updates for Approved → Delivered.

### 5.5 User Management (Super Admin only)
- List staff users with name, email, role, status, last login.
- Add user (invite by email with temporary link or set up password), edit name/role, deactivate/reactivate, reset password, delete (only if never active).
- Role assignment from the four roles above.
- Audit log of user changes.
- Customers (storefront accounts) are viewable in a separate read-only "Customers" list: name, phone, orders count, total spent.

### 5.6 Store Settings (Super Admin)
- Store name, contact details, logo placeholder
- Bank account details shown at payment (supports multiple banks)
- GST rate (default 8%, configurable) and GST registration number shown on invoices
- Greater Malé area definition (list of locations) and islands/ferry list
- Low-stock threshold, pending-order expiry window
- Featured sections on the home page

### 5.7 Audit Log
- Records who did what and when: product changes, stock adjustments, order status changes, user and role changes, settings changes.

---

## 6. Image Handling

### 6.1 Storage
Images are stored in **Supabase Storage** (same Supabase project as the database). The database stores only the file path and metadata. This is used instead of binary-in-Postgres to avoid hitting the 500 MB free database limit.
- Bucket `product-images`: public read, staff-only write.
- Bucket `receipts`: **private**; accessed only through short-lived signed URLs by the customer who owns the order (verified via order number + phone) and by authorised staff.

### 6.2 Product images: compress without visible quality loss
- Accept JPG, PNG, WebP, HEIC up to 15 MB each.
- Convert to **WebP (high quality, ~90) or AVIF** with visually lossless settings; strip EXIF metadata (including GPS); cap the longest edge at 2400 px; keep the original aspect ratio.
- Generate display sizes (e.g. 400, 800, 1600, 2400 px) and serve through `next/image` for responsive loading. Because Vercel's free plan has image optimization limits, pre-generated sizes in Storage are preferred.
- Compression runs **in the browser before upload** (e.g. `browser-image-compression` or canvas) so uploads stay below Vercel's 4.5 MB serverless request limit; files go directly to Supabase Storage via signed upload URLs.
- Validate dimensions (minimum 800 px longest edge recommended) and warn on low-resolution images.

### 6.3 Receipts: compressed
- Compress client-side to max 1600 px longest edge, JPEG/WebP quality ~70 (target under 300 KB), EXIF stripped. Text on the slip must remain legible.
- PDFs are accepted up to 5 MB and stored unchanged.
- Receipts are retained for a configurable period (default 12 months), then can be purged to save storage.

### 6.4 Storage budget (free tier, 1 GB)
Rough estimate: 150 products × 4 images × ~600 KB with variants ≈ 400–700 MB. Receipts at ~250 KB each allow roughly 1,500 or more orders. The admin dashboard shows a storage usage indicator, with a warning at 80%.

---

## 7. Design and Branding

### 7.1 Direction
Quiet luxury: lots of whitespace, large product photography, refined serif headings, subtle motion, and no visual clutter. The look should feel like a high-end fragrance house.

### 7.2 Color palette (navy-based)
| Role | Name | Hex |
|---|---|---|
| Primary | Deep Navy | `#0B1F3A` |
| Primary dark (footer, hero overlay) | Midnight | `#071428` |
| Primary light (hover, links) | Royal Navy | `#1B365D` |
| Secondary | Slate Blue | `#3E5C8A` |
| Accent | Champagne Gold | `#C9A96E` |
| Background | Ivory | `#FAF8F4` |
| Surface | Soft Mist | `#EEF2F8` |
| Border | Pale Steel | `#D5DCE8` |
| Text | Ink | `#12182B` |
| Muted text | Gray Blue | `#5B667C` |
| Success / Warning / Error | `#2F7D5B` / `#B7791F` / `#B23A48` |

Status badge colors: Pending (amber), Slip Uploaded (blue), Approved (green), Rejected (red), Delivered (navy).
All text and interactive colors must meet WCAG AA contrast.

### 7.3 Typography
- Headings: **Cormorant Garamond** (serif, elegant).
- Body/UI: **Jost** or **Inter** (clean sans-serif).
- Loaded with `next/font` (free, self-hosted via Google Fonts).

### 7.4 Components and style
- Thin borders, generous padding, small uppercase letter-spaced labels, gold hairline dividers, and minimal rounded corners (2–6 px).
- Subtle fade/slide animations, with `prefers-reduced-motion` respected.
- Admin dashboard uses the same palette in a cleaner, denser layout (sidebar navigation, data tables, charts in navy/gold/slate tones).
- Responsive and mobile-first; most Maldivian shoppers will be on phones.

### 7.5 Logo
- Temporary: a free placeholder logo (an open-source icon, e.g. from Lucide/Phosphor, combined with a text wordmark in Cormorant Garamond), delivered as SVG in `/public/brand/`.
- The logo is referenced from one component and one config file, so replacing it later with the final logo is a single-file swap (SVG plus favicon and OG image).

---

## 8. Technical Architecture

### 8.1 Stack
| Layer | Choice |
|---|---|
| Framework | Next.js (App Router, React Server Components, TypeScript) |
| Styling | Tailwind CSS + shadcn/ui, themed to the palette |
| Database | Supabase Postgres |
| Auth | Supabase Auth (email + password) for admins and optional customers |
| File storage | Supabase Storage |
| Hosting | Vercel (free plan) |
| Validation | Zod |
| Charts | Recharts |
| Forms | React Hook Form |

### 8.2 Data model (high level)
- `profiles` (id → auth.users, full_name, phone, role: `customer | super_admin | manager | order_staff | inventory_staff`, is_active)
- `categories` (id, name, slug, parent_id, image_path, sort_order)
- `products` (id, name, slug, brand, description, notes_top/heart/base, gender, family, concentration, category_id, status, is_featured, search_vector, seo fields)
- `product_variants` (id, product_id, label, sku, price_mvr, compare_at_price, stock, is_active, sort_order)
- `product_images` (id, product_id, path, alt, sort_order, is_main)
- `stock_movements` (id, variant_id, change, reason, order_id?, user_id, created_at)
- `carts` / `cart_items` (for logged-in users)
- `orders` (id, order_number, user_id?, customer_name, phone, email, delivery_type, island, ferry_details, address, notes, subtotal, gst_amount, delivery_fee, total, status, rejection_reason, expires_at, timestamps)
- `order_items` (id, order_id, product_id, variant_id, name snapshot, variant label snapshot, unit_price snapshot, qty)
- `payment_slips` (id, order_id, path, mime, size, uploaded_at, is_current)
- `order_status_history` (id, order_id, from_status, to_status, changed_by, note, created_at)
- `settings` (key/value JSON: bank accounts, GST, delivery areas, thresholds)
- `audit_logs` (id, user_id, action, entity, entity_id, diff, created_at)

### 8.3 Security
- Row Level Security on all tables. Public can read only published products and categories. Staff access is governed by role.
- Admin role checks happen in Next.js middleware, server actions and RLS. The UI hiding alone is never relied upon.
- Guest order/slip access uses order number + phone verification with rate limiting. Order numbers should be non-sequential (e.g. `AUR-7K2M9Q`) to prevent guessing.
- Stock reservation and order creation run in a single Postgres transaction/function to prevent overselling.
- The Supabase service-role key stays server-side only.
- File uploads validated by type, size and magic bytes. Bot protection (Cloudflare Turnstile) on checkout and tracking lookups.
- Secure headers, CSRF-safe server actions, and password rules enforced by Supabase Auth.

### 8.4 Performance and SEO
- Server-rendered and cached product/category pages (ISR), `next/image`, lazy loading, and proper metadata, Open Graph tags, sitemap and `robots.txt`.
- Structured data (Product schema) on product pages.
- Indexes on slug, category, status, and full-text search vector.

### 8.5 Free-tier constraints and risks
| Item | Constraint | Mitigation |
|---|---|---|
| **Vercel Hobby (free) terms** | The Hobby plan is for **non-commercial / personal use only**. A shop selling products is commercial use. | Fine for development and testing. Plan to upgrade to Vercel Pro before going live and taking real orders, or host elsewhere. |
| Supabase free DB | 500 MB, shared compute | Images kept out of the DB |
| Supabase free storage | 1 GB | Aggressive compression, receipt retention policy, usage warning |
| Supabase inactivity | Free projects are **paused after about 1 week of inactivity** | Keep-alive cron or upgrade before launch |
| Vercel function body limit | 4.5 MB | Direct-to-Storage uploads |
| Vercel cron | Limited frequency on free plan | Daily expiry job |
| No backups on free tier | Risk of data loss | Scheduled export (CSV/SQL dump) of key tables |

---

## 9. Non-Functional Requirements
- **Responsive:** 360 px mobile to desktop.
- **Accessibility:** WCAG 2.1 AA, keyboard navigation, alt text on images.
- **Browsers:** latest two versions of Chrome, Safari, Edge, Firefox.
- **Availability:** best effort on free tiers.
- **Localization:** English only; MVR formatted as `MVR 1,250.00`; dates in the Maldives time zone (Indian/Maldives, UTC+5).
- **Privacy:** collect only necessary data; a privacy policy page; receipts and phone numbers are never publicly accessible.

---

## 10. Release Plan

| Phase | Scope |
|---|---|
| **M1: Foundation** | Project setup, Supabase schema + RLS, auth, roles, design system and layout, logo placeholder |
| **M2: Catalog** | Categories, products, variants, image upload/compression (admin), storefront listing, search, filters, product page |
| **M3: Ordering** | Cart, checkout, stock reservation, payment page, slip upload/compression, tracking page |
| **M4: Order admin** | Order list/detail, slip review, status workflow, history, invoices |
| **M5: Dashboard & users** | Stats and charts, user management, settings, audit log |
| **M6: Polish & launch** | Accessibility, performance, SEO, security review, test data, go-live checklist |

---

## 11. Acceptance Criteria (summary)
1. A visitor can search and combine filters (category, price, size, availability) and the results are correct and shareable via URL.
2. Products display multiple images, variants with their own price and stock, and a correct stock state.
3. A guest can place an order, see bank details, upload a slip, and track the order with order number + phone.
4. Order statuses are limited to Pending, Slip Uploaded, Approved, Rejected, Delivered, and transitions are validated server-side.
5. Concurrent orders for the last unit result in only one success.
6. Product images are stored as compressed WebP/AVIF in Supabase Storage with no visible quality loss; receipts are compressed to roughly 300 KB or less.
7. The admin dashboard shows the KPI cards, charts, and alerts listed in 5.1.
8. Admins can fully create, read, update and delete (or archive) products, variants, categories and images, and fully manage orders.
9. A Super Admin can add, edit, deactivate users and assign any of the four roles; other roles cannot access user management (even via direct URL or API).
10. Greater Malé orders show free doorstep delivery; island orders capture island and ferry details.
11. All prices are in MVR and include GST, with the GST portion shown on the order and invoice.
12. The site uses the navy palette and the placeholder logo, which can be swapped in one place.

---

## 12. Assumptions and Open Questions

### 12.1 Assumptions made in this draft
- English only; MVR only; GST 8% included in all prices (rate editable in settings).
- Customers are guests by default; accounts are optional.
- Stock is reserved at order placement and released on rejection, cancellation or expiry.
- No customer notifications in v1; the tracking page is the only customer-facing status channel.
- Staff accounts are created only by a Super Admin.

### 12.2 Decisions made
| Topic | Decision |
|---|---|
| Customer accounts | Guest checkout + optional account |
| Currency | MVR |
| Roles | Super Admin, Manager, Order Staff, Inventory Staff |
| Image storage | Supabase Storage (not binary in Postgres) |
| Delivery | Free doorstep in Greater Malé; islands delivered to the ferry |
| GST | Prices include GST |
| Notifications | None in v1 |

### 12.3 Open questions
1. Which exact locations count as "Greater Malé area" (Malé, Hulhumalé, Villimalé, others)?
2. For island orders, who pays the ferry cost, and do you need ferry names/times captured or only the island name?
3. After a **Rejected** slip, should the customer be allowed to re-upload (as drafted), or is Rejected final? Do you also want a separate **Cancelled** status, or should cancelled orders reuse Rejected?
4. Bank details: which banks (BML, MIB, others), and should several accounts be shown?
5. Product catalog size at launch (roughly how many products and variants) so storage can be planned?
6. Business name, brand name and domain, and whether a GST registration number should appear on invoices.
7. Do you want a Pending-order auto-expiry (suggested 48 h), and is that window right?
8. Since Vercel's free Hobby plan is not permitted for commercial use, is the plan to upgrade at launch?
