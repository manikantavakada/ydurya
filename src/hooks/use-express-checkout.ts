'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/toast';
import { openCashfreeCheckout } from '@/lib/cashfree/sdk';
import type { OrderDTO } from '@/types';

/**
 * Straight from a button to Cashfree's payment sheet.
 *
 * One server round trip creates the order *and* its checkout session, then the
 * sheet opens over the current page. There is no intermediate form, because
 * with One Click Checkout there is nothing left for one to ask: Cashfree signs
 * the customer in by phone number and supplies the address, contact details
 * and the choice of COD.
 *
 * Used by both entry points, so they cannot drift apart:
 *   • "Buy now" on a product page → that one item, cart untouched
 *   • "Checkout" in the bag       → everything in the bag
 *
 * Falls back to the full `/checkout` page whenever the express path is
 * unavailable — express disabled server-side, a stale session, or the sheet
 * failing to open — so the customer always has a way to complete the order.
 */
export function useExpressCheckout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  /**
   * One key per attempt, so a double-tapped button cannot create two orders.
   * Regenerated only after a failure, which makes a corrected retry a genuine
   * new attempt rather than a replay of the failed one.
   */
  const idempotencyKey = React.useRef<string>(crypto.randomUUID());

  const start = React.useCallback(
    async (options?: { buyNow?: { variantId: string; quantity: number } }) => {
      if (pending) return;
      setPending(true);

      try {
        const res = await fetch('/api/checkout/express', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...options, idempotencyKey: idempotencyKey.current }),
        });
        const json = await res.json().catch(() => ({}));

        if (!res.ok) {
          idempotencyKey.current = crypto.randomUUID();
          // Express is unavailable rather than broken — send them to the form
          // instead of dead-ending on an error toast.
          if (res.status === 400 && !options?.buyNow) {
            router.push('/checkout');
            return;
          }
          throw new Error(json?.error?.message ?? 'We could not start checkout.');
        }

        const order = json.order as OrderDTO;
        // The bag is untouched by "buy now", but a cart checkout empties it.
        if (!options?.buyNow) await queryClient.invalidateQueries({ queryKey: ['cart'] });

        if (json.paymentSessionId) {
          const result = await openCashfreeCheckout(json.paymentSessionId as string);
          // The sheet opens as an in-page modal (`redirectTarget: '_modal'`),
          // not a full-page redirect, so Cashfree never navigates anywhere on
          // its own — closing the modal (paid, cancelled, or failed) just
          // resolves this promise on the page the customer already had open.
          // Sending them to the confirmation route ourselves is what actually
          // shows a result; it re-verifies with the gateway server-side
          // before ever describing the order as paid.
          if (result.opened) {
            router.push(`/checkout/confirmation/${order.orderNumber}`);
            return;
          }
          console.warn('[express] Cashfree sheet unavailable:', result.reason);
        }

        if (json.redirectUrl) {
          window.location.href = json.redirectUrl as string;
          return;
        }

        // The order exists and is awaiting payment; the confirmation page says
        // exactly that rather than implying success.
        router.push(`/checkout/confirmation/${order.orderNumber}`);
      } catch (err) {
        toast({
          title: err instanceof Error ? err.message : 'Something went wrong.',
          variant: 'error',
        });
        setPending(false);
      }
    },
    [pending, queryClient, router, toast],
  );

  return { start, pending };
}
