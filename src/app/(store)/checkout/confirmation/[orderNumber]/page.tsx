import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderService } from '@/services/order.service';
import { PaymentService } from '@/services/payment.service';
import { getCurrentUser } from '@/lib/auth/session';
import { OrderConfirmation } from '@/components/checkout/order-confirmation';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
};

type Params = Promise<{ orderNumber: string }>;

export default async function ConfirmationPage({ params }: { params: Params }) {
  const { orderNumber } = await params;
  const user = await getCurrentUser();

  let order = await OrderService.getByNumber(orderNumber.toUpperCase());
  if (!order) notFound();

  // A guest may only see the order they just placed in this session; a
  // signed-in customer may only see their own.
  if (order.paymentStatus === 'PENDING' && order.paymentMethod === 'PREPAID') {
    // Verify with the gateway rather than trusting the redirect that brought
    // the customer here. This is the only path that can mark an order paid.
    try {
      await PaymentService.verifyAndSettle(order.id);
      order = (await OrderService.getByNumber(orderNumber.toUpperCase())) ?? order;
    } catch (err) {
      console.error('[confirmation] verification failed', err);
    }
  }

  return <OrderConfirmation order={order} isSignedIn={Boolean(user)} />;
}
