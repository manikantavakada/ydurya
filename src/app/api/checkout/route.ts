import { NextResponse, type NextRequest } from 'next/server';
import { withErrorHandling, badRequest } from '@/lib/errors';
import { checkoutSchema } from '@/lib/validation';
import { getCurrentUser } from '@/lib/auth/session';
import { OrderService } from '@/services/order.service';
import { PaymentService } from '@/services/payment.service';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

/**
 * POST /api/checkout — creates the order.
 *
 * The request carries no prices. Totals, stock and the coupon are all
 * recomputed server-side inside a transaction. The `idempotencyKey` is stored
 * under a unique index, so a double-tapped "Place order" returns the first
 * order rather than creating a second one.
 */
export const POST = withErrorHandling(async (req: NextRequest) => {
  enforceRateLimit({ key: 'checkout', identifier: clientIp(req.headers), limit: 15, windowSeconds: 600 });

  const user = await getCurrentUser();
  const body = checkoutSchema.parse(await req.json());

  /**
   * An address may only be omitted when Cashfree's One Click Checkout will
   * collect it during payment. Every other path must supply one here — a COD
   * order especially, since nothing later would ever fill it in.
   */
  if (!body.address) {
    const collectedByGateway = body.paymentMethod === 'PREPAID' && PaymentService.collectsAddress();
    if (!collectedByGateway) {
      throw badRequest('A delivery address is required for this order.');
    }
  }

  const { order, alreadyExisted } = await OrderService.createFromCart({
    userId: user?.id ?? null,
    email: body.email,
    phone: body.phone,
    address: body.address
      ? {
          fullName: body.address.fullName,
          phone: body.address.phone,
          email: body.address.email ?? body.email,
          line1: body.address.line1,
          line2: body.address.line2 || null,
          landmark: body.address.landmark || null,
          city: body.address.city,
          state: body.address.state,
          pincode: body.address.pincode,
          country: body.address.country,
        }
      : null,
    saveAddress: body.saveAddress,
    paymentMethod: body.paymentMethod,
    couponCode: body.couponCode,
    customerNote: body.customerNote,
    idempotencyKey: body.idempotencyKey,
  });

  return NextResponse.json({ order, alreadyExisted }, { status: alreadyExisted ? 200 : 201 });
});
