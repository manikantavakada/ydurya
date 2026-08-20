import { z } from 'zod';

/**
 * Server-side environment contract. Parsed once at module load so a
 * misconfigured deployment fails at boot rather than at checkout.
 */
const serverSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  NEXTAUTH_SECRET: z.string().min(32, 'NEXTAUTH_SECRET must be at least 32 chars'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Shipping is handled manually via the admin panel. This is the seam for a
  // future carrier integration — see src/services/shipping/index.ts.
  SHIPPING_PROVIDER: z.enum(['manual']).default('manual'),

  PAYMENT_PROVIDER: z.enum(['cashfree', 'fastrr', 'manual']).default('manual'),
  // Shared by every provider: Cashfree's x-client-id/x-client-secret,
  // Fastrr's X-Api-Key/secret.
  PAYMENT_API_KEY: z.string().optional().default(''),
  PAYMENT_SECRET: z.string().optional().default(''),

  // ── Cashfree (docs.cashfree.com) ─────────────────────────────────────────
  CASHFREE_BASE_URL: z.string().default('https://sandbox.cashfree.com/pg'),
  // Cashfree versions its API by release date. "2023-08-01" is their
  // long-stable version referenced throughout their SDKs and most published
  // integration guides; their "latest" docs page currently points at a newer
  // dated version. Either works — confirm which in your dashboard, and if
  // requests start failing with 400s this is the first thing to check.
  // One Click Checkout requires 2025-01-01 or later — the `products` and
  // `cart_details` objects it depends on do not exist in 2023-08-01.
  CASHFREE_API_VERSION: z.string().default('2025-01-01'),

  /**
   * One Click Checkout: let Cashfree collect the delivery address.
   *
   * With this on, a customer signs in to Cashfree with their phone number and
   * picks from addresses already saved across Cashfree's merchant network, so
   * a first-time YDURYA buyer usually types nothing at all. Our own checkout
   * form is then skipped for guests entirely.
   *
   * Requires the One Click Checkout product to be active on the Cashfree
   * account (Merchant Dashboard → Payment Gateway → PG Products).
   */
  CASHFREE_ONE_CLICK_CHECKOUT: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  // ── Fastrr (from their "Full checkout custom Integration APIs [PUBLIC]"
  // Postman collection). Staging by default; switch to the production base
  // URL (https://checkout-api.shiprocket.com) when going live.
  PAYMENT_BASE_URL: z.string().default('https://fastrr-api-dev.pickrr.com'),
  FASTRR_PATH_CREATE: z.string().default('/api/v1/access-token/checkout'),
  FASTRR_PATH_STATUS: z.string().default('/api/v1/custom-platform-order/details'),
  FASTRR_PATH_TRANSACTIONS: z.string().default('/api/v1/custom-platform-order/details/transactions'),

  UPLOAD_DIR: z.string().default('./public/uploads'),
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(8),
});

const publicSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url().default('http://localhost:3000'),
  NEXT_PUBLIC_SITE_NAME: z.string().default('YDURYA'),
  NEXT_PUBLIC_UPLOAD_PATH: z.string().default('/uploads'),
  NEXT_PUBLIC_PAYMENT_PROVIDER: z.string().default('manual'),
  // Passed straight to Cashfree's official `@cashfreepayments/cashfree-js`
  // SDK's `load({ mode })` call. Switch to "production" before go-live.
  NEXT_PUBLIC_CASHFREE_MODE: z.enum(['sandbox', 'production']).default('sandbox'),
  // Fastrr's checkout UI bundle + stylesheet ("Checkout UI Flow" in their
  // Postman collection). Empty = the widget is never attempted; checkout then
  // leaves the order PENDING with an honest message (COD is unaffected).
  // Staging defaults shown; switch to the production URLs before go-live:
  //   https://checkout-ui.shiprocket.com/assets/js/channels/shopify.js
  //   https://checkout-ui.shiprocket.com/assets/styles/shopify.css
  NEXT_PUBLIC_FASTRR_SDK_URL: z.string().optional().default(''),
  NEXT_PUBLIC_FASTRR_SDK_CSS_URL: z.string().optional().default(''),
  NEXT_PUBLIC_GA_MEASUREMENT_ID: z.string().optional().default(''),
  NEXT_PUBLIC_META_PIXEL_ID: z.string().optional().default(''),
});

/** Values safe to reference in client bundles. */
export const publicEnv = publicSchema.parse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SITE_NAME: process.env.NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_UPLOAD_PATH: process.env.NEXT_PUBLIC_UPLOAD_PATH,
  NEXT_PUBLIC_PAYMENT_PROVIDER: process.env.NEXT_PUBLIC_PAYMENT_PROVIDER,
  NEXT_PUBLIC_CASHFREE_MODE: process.env.NEXT_PUBLIC_CASHFREE_MODE,
  NEXT_PUBLIC_FASTRR_SDK_URL: process.env.NEXT_PUBLIC_FASTRR_SDK_URL,
  NEXT_PUBLIC_FASTRR_SDK_CSS_URL: process.env.NEXT_PUBLIC_FASTRR_SDK_CSS_URL,
  NEXT_PUBLIC_GA_MEASUREMENT_ID: process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID,
  NEXT_PUBLIC_META_PIXEL_ID: process.env.NEXT_PUBLIC_META_PIXEL_ID,
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/**
 * Lazily validated server env. Throwing here is deliberate — it is far better
 * to fail a deploy than to run a store with a missing payment secret.
 */
export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
    throw new Error(`Invalid server environment:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

export const isProd = process.env.NODE_ENV === 'production';
