import { NextResponse, type NextRequest } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { registerSchema } from '@/lib/validation';
import { CustomerService } from '@/services/customer.service';
import { CartService } from '@/services/cart.service';
import { createSession } from '@/lib/auth/session';
import { clientIp, enforceRateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export const POST = withErrorHandling(async (req: NextRequest) => {
  const ip = clientIp(req.headers);
  enforceRateLimit({ key: 'register', identifier: ip, limit: 5, windowSeconds: 3600 });

  const body = registerSchema.parse(await req.json());
  const user = await CustomerService.register(body);

  await createSession(user.id, user.email, user.role);
  // Anything the customer put in the bag before signing up follows them in.
  await CartService.mergeGuestCart(user.id);

  return NextResponse.json({
    user: { id: user.id, email: user.email, firstName: user.firstName, role: user.role },
  });
});
