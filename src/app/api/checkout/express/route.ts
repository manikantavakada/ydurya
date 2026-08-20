import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { withErrorHandling, badRequest } from '@/lib/errors';
import { getCurrentUser } from '@/lib/auth/session';
import { CustomerService } from '@/services/customer.service';
import { OrderService } from '@/services/order.service';
import { PaymentService } from '@/services/payment.service';
import { cuidSchema } from '@/lib/validation';
import { PENDING_EMAIL, PENDING_PHONE } from '@/lib/checkout/placeholders';
import { publicEnv } from '@/lib/env';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const expressSchema = z.object({
  idempotencyKey: z.string().uuid('A valid idempotency key is required.'),
  /** Present for "Buy now"; absent to buy everything in the bag. */
  buyNow: z
    .object({
      variantId: cuidSchema,
      quantity: z.coerce.number().int().min(1).max(10).default(1),
    })
    .optional(),
  couponCode: z.string().trim().max(64).optional().nullable(),
});

/**
 * POST /api/checkout/express — one call, straight to the payment sheet.
 *
 * Creates the order *and* its Cashfree checkout session together, so a
 * customer can go from "Buy now" (or the bag) to Cashfree's payment sheet
 * without an intermediate form. Cashfree's One Click Checkout signs them in
 * by phone number and supplies the delivery address, the contact details and
 * the choice of COD — all of which we read back on settlement.
 *
 * Only available when One Click Checkout is actually on: without it nobody
 * would ever collect an address, so the route refuses rather than creating an
 * undeliverable order. The normal `/api/checkout` form remains the fallback.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  enforceRateLimit({ key: 'checkout', identifier: clientIp(req.headers), limit: 15, windowSeconds: 600 });

  if (!PaymentService.collectsAddress()) {
    throw badRequest('Express checkout is unavailable. Please use the standard checkout.');
  }

  const user = await getCurrentUser();
  const body = expressSchema.parse(await req.json());

  /**
   * A signed-in customer's own details are better than anything Cashfree can
   * infer, so they are used to pre-fill its sheet. A guest supplies nothing:
   * Cashfree asks for the number itself, and placeholders are backfilled from
   * the gateway once payment settles.
   */
  const profile = user ? await CustomerService.getProfile(user.id) : null;
  const addresses = user ? await CustomerService.listAddresses(user.id) : [];
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;

  const { order, alreadyExisted } = await OrderService.createFromCart({
    userId: user?.id ?? null,
    email: user?.email ?? PENDING_EMAIL,
    phone: profile?.phone ?? defaultAddress?.phone ?? PENDING_PHONE,
    // A saved address still wins — no reason to make a returning customer
    // re-pick one inside Cashfree.
    address: defaultAddress
      ? {
          fullName: defaultAddress.fullName,
          phone: defaultAddress.phone,
          email: user?.email ?? null,
          line1: defaultAddress.line1,
          line2: defaultAddress.line2,
          landmark: defaultAddress.landmark,
          city: defaultAddress.city,
          state: defaultAddress.state,
          pincode: defaultAddress.pincode,
          country: defaultAddress.country,
        }
      : null,
    saveAddress: false,
    // Cashfree's sheet offers COD itself; the order is opened as prepaid and
    // corrected on settlement if the customer chose COD there.
    paymentMethod: 'PREPAID',
    couponCode: body.couponCode ?? null,
    idempotencyKey: body.idempotencyKey,
    buyNow: body.buyNow ?? null,
  });

  const base = publicEnv.NEXT_PUBLIC_SITE_URL;
  const payment = await PaymentService.createPayment(
    order.id,
    `${base}/checkout/confirmation/${order.orderNumber}`,
    `${base}/api/webhooks/payment`,
  );

  return NextResponse.json(
    {
      order,
      alreadyExisted,
      paymentSessionId: (payment.clientConfig as { paymentSessionId?: string } | undefined)?.paymentSessionId ?? null,
      redirectUrl: payment.redirectUrl ?? null,
    },
    { status: alreadyExisted ? 200 : 201 },
  );
});
