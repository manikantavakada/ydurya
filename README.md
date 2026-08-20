# YDURYA — E-commerce Platform

A production e-commerce application for **YDURYA**, India's student-wear brand
(Visakhapatnam, est. 2025). Built to replace the existing Shopify storefront with
the same commerce behaviour and a faster, better-structured front end.

- **Storefront** — Next.js App Router, server-rendered, mobile-first
- **Admin** — full catalogue, order, inventory, coupon, banner and settings management
- **Payments** — Fastrr (Shiprocket Checkout), behind a swappable provider interface
- **Shipping** — manual tracking entered in the admin; carrier API seam left open
- **Hosting** — Hostinger Node.js hosting + Hostinger MySQL. No VPS, no S3/Cloudinary/Redis.

Brand, catalogue and commerce rules were extracted from the live site — see
[`docs/BRAND.md`](docs/BRAND.md) for the source of every colour, font, price and fee.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Quick start](#quick-start)
3. [Folder structure](#folder-structure)
4. [Database schema](#database-schema)
5. [Environment variables](#environment-variables)
6. [Importing the catalogue](#importing-the-catalogue)
7. [Admin access](#admin-access)
8. [Commerce rules](#commerce-rules)
9. [Documentation index](#documentation-index)

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components keep JS small and SEO strong |
| Language | TypeScript (strict) | — |
| Styling | Tailwind CSS 3 | Brand tokens map to the live theme's CSS variables |
| UI primitives | Radix UI + custom components | Accessible dialogs, sheets, accordions |
| Animation | Framer Motion (available), CSS-first | Most motion is CSS; JS only where needed |
| Forms | React Hook Form + Zod | One schema validates client and server |
| Server state | TanStack Query | Cart, wishlist and search only |
| ORM | Prisma 6 | Parameterised queries, typed schema |
| Database | MySQL 8 | Hostinger-native |
| Images | `sharp` → WebP on local disk | No external image service |
| Auth | Custom JWT (`jose`) + bcrypt + DB sessions | No beta dependency; revocable sessions |

---

## Quick start

Requires **Node 20.11+** (Node 22 recommended) and a MySQL 8 database.

```bash
git clone <your-repo> ydurya && cd ydurya
npm install

cp .env.example .env
# Fill in DATABASE_URL, then generate a secret:
#   openssl rand -base64 32   → NEXTAUTH_SECRET

npm run db:deploy       # apply migrations
npm run db:seed         # sizes, colours, categories, settings, homepage bands, admin
npm run import:shopify  # pull the real YDURYA catalogue + images
npm run import:home-art # optimise campaign artwork from assets/ (optional)

npm run dev             # http://localhost:3000
```

The seed creates `admin@ydurya.com` / `ChangeMe123!` in development.
**Change it immediately** — see [Admin access](#admin-access).

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Development server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Create a migration (development) |
| `npm run db:deploy` | Apply migrations (production) |
| `npm run db:studio` | Prisma Studio |
| `npm run db:seed` | Reference data + settings + admin |
| `npm run import:shopify` | Import catalogue, images and policy pages |
| `npm run import:home-art` | Optimise `assets/` artwork into the homepage bands |
| `npm run check:payments` | Verify Fastrr credentials and endpoints |
| `npm run admin:create` | Create or promote an admin user |
| `npm run lint` | ESLint |

---

## Folder structure

```
ydurya/
├── prisma/
│   ├── schema.prisma            # 35 models — the single source of truth
│   ├── migrations/              # SQL migrations (committed)
│   └── seed.ts                  # reference data, settings, banners, admin
│
├── scripts/
│   ├── import-shopify.ts        # catalogue + image + page importer
│   ├── create-admin.ts          # admin provisioning
│   └── load-env.ts              # .env loader for standalone scripts
│
├── assets/                      # drop campaign artwork here → import:home-art
├── data/                        # snapshot of the source catalogue JSON
│
├── src/
│   ├── app/
│   │   ├── (store)/             # customer storefront
│   │   │   ├── page.tsx                  # home
│   │   │   ├── shop/                     # all products
│   │   │   ├── category/[slug]/          # collection listing
│   │   │   ├── product/[slug]/           # PDP
│   │   │   ├── search/
│   │   │   ├── cart/
│   │   │   ├── checkout/                 # + confirmation/[orderNumber]
│   │   │   ├── account/                  # login, register, orders, addresses…
│   │   │   ├── wishlist/
│   │   │   ├── track-order/
│   │   │   └── pages/[slug]/             # About, policies (imported content)
│   │   │
│   │   ├── (admin)/admin/       # gated admin panel
│   │   │   ├── dashboard/  orders/  products/  inventory/
│   │   │   ├── categories/ customers/ coupons/ banners/
│   │   │   ├── reviews/    settings/
│   │   │   └── layout.tsx                # authoritative RBAC gate
│   │   │
│   │   ├── (admin-auth)/admin/login/     # ungated, outside the gate
│   │   │
│   │   ├── api/                 # route handlers — see docs/API.md
│   │   ├── sitemap.ts  robots.ts
│   │   ├── error.tsx  global-error.tsx  not-found.tsx
│   │   └── globals.css                   # brand design tokens
│   │
│   ├── components/
│   │   ├── home/                # editorial bands, scroll reveal, section rails
│   │   ├── ui/                  # button, input, sheet, price, toast, states
│   │   ├── store/               # header, footer, hero, nav, cart drawer, search
│   │   ├── product/             # card, grid, rail, gallery, buy box
│   │   ├── shop/                # filters, sort, listing
│   │   ├── cart/  checkout/  account/  admin/  seo/
│   │
│   ├── services/                # ALL business logic lives here
│   │   ├── product.service.ts       order.service.ts
│   │   ├── category.service.ts      payment.service.ts
│   │   ├── cart.service.ts          shipping.service.ts
│   │   ├── pricing.service.ts       inventory.service.ts
│   │   ├── coupon.service.ts        customer.service.ts
│   │   ├── media.service.ts         wishlist.service.ts
│   │   ├── banner.service.ts        review.service.ts
│   │   ├── search.service.ts        dashboard.service.ts
│   │   ├── audit.service.ts
│   │   ├── payment/             # provider interface + fastrr + manual
│   │   └── shipping/            # provider interface + manual
│   │
│   ├── lib/
│   │   ├── auth/                # jwt, password, rbac, session
│   │   ├── analytics/           # provider-agnostic event layer
│   │   ├── validation/          # every Zod schema
│   │   ├── env.ts  prisma.ts  money.ts  errors.ts
│   │   ├── settings.ts  brand.ts  rate-limit.ts  image-store.ts  utils.ts
│   │
│   ├── data/                    # homepage default composition
│   ├── hooks/                   # use-cart, use-wishlist
│   ├── types/                   # shared DTOs
│   └── middleware.ts            # edge gate for /admin
│
├── public/
│   ├── uploads/                 # product & banner media (gitignored)
│   └── images/  icons/
│
└── docs/
    ├── BRAND.md  ARCHITECTURE.md  API.md  DEPLOYMENT.md  CHECKLISTS.md
```

**Rule:** UI components never contain business logic. A component calls a service
or an API route; pricing, stock and permissions are decided server-side.

---

## Database schema

35 models. Money is **always** `Decimal(10,2)` — never a float. Internally the
application works in integer paise and converts at the database boundary
(`src/lib/money.ts`).

### Identity
| Model | Purpose |
|---|---|
| `User` | Customers and staff. `role` ∈ CUSTOMER / STAFF / ADMIN / SUPER_ADMIN |
| `Session` | Server-side session registry — this is what makes logout real |
| `PasswordResetToken` | SHA-256 hashes only; raw tokens are never stored |
| `Address` | Address book; soft-deleted so old orders still resolve |

### Catalogue
| Model | Purpose |
|---|---|
| `Product` | `slug` + `legacyHandle` (old Shopify URLs 301 to the new slug) |
| `ProductCategory` | Explicit join — a product can sit in many collections |
| `ProductImage` | Path + blur placeholder; flags `aiGenerated` and `isPlaceholder` |
| `ProductVariant` | Size × colour, unique on `(productId, sizeId, colorId)`; holds the authoritative price |
| `Size`, `Color` | Reference tables driving the filters |
| `Category` | Self-referencing tree, `showInNav` controls the header |

### Inventory
| Model | Purpose |
|---|---|
| `Inventory` | `quantity`, `reserved`, `lowStockThreshold`. **available = quantity − reserved** |
| `InventoryLedger` | Append-only history — every change records reason, delta, actor |

### Commerce
| Model | Purpose |
|---|---|
| `Cart` / `CartItem` | `userId` or `guestToken`; merged on login |
| `Wishlist` / `WishlistItem` | Account-bound; guests use localStorage |
| `Order` | Frozen totals + `addressSnapshot`; `idempotencyKey` is uniquely indexed |
| `OrderItem` | Snapshots name/SKU/price so history survives catalogue edits |
| `OrderEvent` | Immutable timeline shown to the customer |
| `Payment` | Provider references only — **no card data, ever** |
| `Shipment` | Courier, tracking number, ETA, status |
| `Coupon` / `CouponUsage` | All rules enforced server-side |
| `Banner` | Separate desktop/mobile art + optional `videoUrl` (hero video seam) |
| `Review` | Unapproved by default; `isVerified` derives from a delivered order |
| `Page` | About/contact/policies, imported from the live site |
| `HomepageSection` | Editorial bands — artwork, copy, link, order, focal point |

### System
`Setting` (commerce rules), `AuditLog` (who changed what), `WebhookEvent`
(replay-safe provider events), `NewsletterSubscriber`, `SearchQuery`.

Every table has `createdAt`/`updatedAt`, foreign keys, and indexes on the columns
actually filtered on. Catalogue and customer records soft-delete via `deletedAt`;
orders are never deleted.

---

## Environment variables

See [`.env.example`](.env.example). **Never commit `.env`.**

| Variable | Required | Notes |
|---|:--:|---|
| `DATABASE_URL` | ✅ | `mysql://user:pass@host:3306/db` |
| `NEXTAUTH_SECRET` | ✅ | ≥32 chars. `openssl rand -base64 32` |
| `NEXT_PUBLIC_SITE_URL` | ✅ | `https://ydurya.com` — used for canonicals, sitemap, webhooks |
| `NEXT_PUBLIC_SITE_NAME` | | Defaults to `YDURYA` |
| `PAYMENT_PROVIDER` | | `fastrr` or `manual` (default) |
| `PAYMENT_API_KEY` / `PAYMENT_SECRET` | for prepaid | From your Fastrr merchant dashboard |
| `PAYMENT_BASE_URL` | | Fastrr API base |
| `FASTRR_PATH_CREATE` / `_STATUS` / `_TRANSACTIONS` | | REST paths — confirmed defaults, rarely need changing |
| `NEXT_PUBLIC_PAYMENT_PROVIDER` | | Mirrors the above for the client |
| `SHIPPING_PROVIDER` | | `manual` only today |
| `UPLOAD_DIR` | | Default `./public/uploads` |
| `NEXT_PUBLIC_UPLOAD_PATH` | | Default `/uploads` |
| `MAX_UPLOAD_MB` | | Default `8` |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | | Empty = no tracking loaded |
| `NEXT_PUBLIC_META_PIXEL_ID` | | Empty = no tracking loaded |

The server env is parsed by Zod at boot (`src/lib/env.ts`) — a misconfigured
deployment fails immediately rather than at checkout.

---

## Importing the catalogue

```bash
npm run import:shopify                # live fetch + download images
npm run import:shopify -- --dry-run   # report only
npm run import:shopify -- --offline   # use the snapshot in /data
npm run import:shopify -- --no-images # metadata only
```

Reads only the **public** Shopify JSON (`/products.json`, `/collections.json`) and
the published pages — the same documents any visitor receives. No Admin API
credentials are used or needed.

It is **idempotent**: products match on their original handle and update in place.

It reports everything that needs human attention afterwards, including:

- products the source store left without a description
- handles that disagree with their product name (old URLs are 301'd)
- images that could not be downloaded (a clear placeholder is created)
- **stock quantities** — the public feed exposes only in/out of stock, never counts,
  so available variants are set to 1 and flagged. Set real numbers in
  **Admin → Inventory** before going live.

> **Note on imagery.** The live store's product photos are files named
> `ChatGPTImage*.png` — they are already AI-generated. They are imported as the
> brand's current assets and flagged `aiGenerated` in the admin so they can be
> swapped for real photography. This project generates no imagery of its own.

---

## Admin access

```bash
npm run admin:create -- --email you@ydurya.com --password 'a-strong-password' --role SUPER_ADMIN
```

Roles and what they unlock:

| | STAFF | ADMIN | SUPER_ADMIN |
|---|:--:|:--:|:--:|
| Products, inventory, media | ✅ | ✅ | ✅ |
| Orders (view, status, tracking) | ✅ | ✅ | ✅ |
| Refunds | — | ✅ | ✅ |
| Categories, coupons, banners, reviews | read | ✅ | ✅ |
| Customers | read | ✅ | ✅ |
| Settings, audit log | — | ✅ | ✅ |
| Manage other admins | — | — | ✅ |

Sign in at `/admin/login`. Changing a password revokes every existing session.

---

## Commerce rules

Extracted from the live storefront, editable in **Admin → Settings**:

| Rule | Value |
|---|---|
| Shipping | ₹99 flat |
| Free shipping | Orders over ₹999 |
| Handling | ₹7 per item |
| Cash on delivery | +₹27 |
| Currency | INR, `en-IN` |
| Return window | 3 days from delivery (per the published policy) |

All of these are recomputed server-side at checkout. The client never sends a
price, and any price it does send is ignored.

---

## Enabling Fastrr checkout

The store ships on the **manual** payment provider: cash on delivery works,
online payment is hidden, and no order is ever auto-marked as paid.

To turn prepaid on:

```bash
PAYMENT_PROVIDER="fastrr"
NEXT_PUBLIC_PAYMENT_PROVIDER="fastrr"
PAYMENT_API_KEY="…"
PAYMENT_SECRET="…"
```

Then verify before taking a single order:

```bash
npm run check:payments
```

It reports what checkout will actually do and probes the configured endpoint,
so a wrong path or auth style surfaces there rather than on a customer's order.
It never creates a payment.

> **Fastrr's REST paths are per-merchant.** Fastrr publishes them (and which
> auth header it expects) in the merchant dashboard rather than in a public
> spec, and they differ between accounts. They are therefore configuration —
> `FASTRR_PATH_*` — with the confirmed shape as defaults (see
> `docs/ARCHITECTURE.md` for the full spec, taken directly from Shiprocket's
> own Postman collection rather than inferred).
> Copy the exact values from your dashboard. Nothing in the application depends
> on them beyond `src/services/payment/fastrr.provider.ts`.

Fastrr also offers a hosted widget (the storefront loads their script and hands
over the cart). The provider interface accommodates that too — see
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md#payments).

Finally, set the webhook in the Fastrr dashboard to
`https://ydurya.com/api/webhooks/payment` and place one real ₹1 order end to
end. An order is only ever marked paid by that signed webhook or by a
server-side verification — never by the browser.

---

## Documentation index

| Document | Contents |
|---|---|
| [`docs/BRAND.md`](docs/BRAND.md) | Colours, fonts, copy and catalogue — with sources |
| [`docs/HOMEPAGE.md`](docs/HOMEPAGE.md) | The editorial homepage: artwork workflow, ratios, focal points |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Layering, pricing engine, inventory model, integrations |
| [`docs/API.md`](docs/API.md) | Every endpoint, payload and error code |
| [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) | Hostinger setup, domain, SSL, backups |
| [`docs/CHECKLISTS.md`](docs/CHECKLISTS.md) | Security, performance and go-live checklists |
