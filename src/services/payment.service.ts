import 'server-only';
import { PaymentMethod, PaymentStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AppError, notFound } from '@/lib/errors';
import { env } from '@/lib/env';
import { toDecimal, toPaise } from '@/lib/money';
import { CashfreeProvider } from './payment/cashfree.provider';
import { FastrrProvider } from './payment/fastrr.provider';
import { ManualProvider } from './payment/manual.provider';
import type { PaymentProvider, WebhookResult } from './payment/types';

export type { PaymentProvider, WebhookResult };

let provider: PaymentProvider | null = null;

/** Resolves the configured gateway once per process. */
export function paymentProvider(): PaymentProvider {
  if (provider) return provider;
  const configured = env().PAYMENT_PROVIDER;
  const candidate: PaymentProvider =
    configured === 'cashfree' ? new CashfreeProvider() : configured === 'fastrr' ? new FastrrProvider() : new ManualProvider();
  // If a gateway is selected but has no credentials, fall back rather than
  // failing every checkout — COD still works and prepaid is hidden in the UI.
  provider = candidate.isConfigured() ? candidate : new ManualProvider();
  return provider;
}

export const PaymentService = {
  isPrepaidAvailable(): boolean {
    return paymentProvider().name !== 'manual';
  },

  /**
   * True when the gateway collects the delivery address itself, so our own
   * checkout can skip asking for one. Currently only Cashfree's One Click
   * Checkout does this.
   */
  collectsAddress(): boolean {
    return paymentProvider() instanceof CashfreeProvider && env().CASHFREE_ONE_CLICK_CHECKOUT;
  },

  /** Creates the Payment row and the gateway checkout session for a prepaid order. */
  async createPayment(orderId: string, returnUrl: string, notifyUrl: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        shippingAddress: true,
        payments: true,
        items: { select: { variantId: true, quantity: true, productName: true, unitPrice: true } },
      },
    });
    if (!order) throw notFound('Order not found.');

    // Re-use an in-flight attempt instead of creating a second gateway session.
    const existing = order.payments.find(
      (p) => p.status === PaymentStatus.PENDING && p.method === PaymentMethod.PREPAID && p.providerOrderId,
    );
    if (existing?.providerOrderId) {
      return { paymentId: existing.id, providerOrderId: existing.providerOrderId, redirectUrl: undefined, clientConfig: undefined };
    }

    const gateway = paymentProvider();
    const snapshot = order.addressSnapshot as { fullName?: string } | null;

    // Fastrr's checkout session is built from cart lines, not a bare total —
    // every item must resolve to a variant, which order creation guarantees.
    const lines = order.items
      .filter((i) => Boolean(i.variantId))
      .map((i) => ({
        variantId: i.variantId as string,
        quantity: i.quantity,
        name: i.productName,
        unitPricePaise: toPaise(i.unitPrice),
      }));

    const created = await gateway.createPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amountPaise: toPaise(order.grandTotal),
      currency: order.currency,
      customer: {
        name: snapshot?.fullName ?? order.shippingAddress?.fullName ?? 'Customer',
        email: order.email,
        phone: order.phone,
      },
      lines,
      couponCode: order.couponCode,
      returnUrl,
      notifyUrl,
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        provider: gateway.name,
        method: PaymentMethod.PREPAID,
        status: PaymentStatus.PENDING,
        amount: order.grandTotal,
        currency: order.currency,
        providerOrderId: created.providerOrderId,
      },
    });

    return {
      paymentId: payment.id,
      providerOrderId: created.providerOrderId,
      redirectUrl: created.redirectUrl,
      clientConfig: created.clientConfig,
    };
  },

  /**
   * Server-side verification. This is the ONLY way a prepaid order becomes
   * paid — the browser's "payment succeeded" callback (and, for Fastrr, its
   * unsigned webhook) merely triggers this check, it is never itself believed.
   */
  async verifyAndSettle(orderId: string): Promise<{ status: PaymentStatus; settled: boolean }> {
    const payment = await prisma.payment.findFirst({
      where: { orderId, method: PaymentMethod.PREPAID },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment?.providerOrderId) throw notFound('No payment attempt found for this order.');
    if (payment.status === PaymentStatus.PAID) return { status: PaymentStatus.PAID, settled: false };

    const result = await paymentProvider().verifyPayment(payment.providerOrderId);

    // Guard against an under-payment being accepted as settlement.
    if (result.status === PaymentStatus.PAID && result.amountPaise != null) {
      const expected = toPaise(payment.amount);
      if (result.amountPaise < expected) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.FAILED,
            failureReason: `Amount mismatch: received ${result.amountPaise}, expected ${expected}`,
            providerPayload: result.raw as Prisma.InputJsonValue,
          },
        });
        throw new AppError('PAYMENT_ERROR', 'The amount paid did not match the order total.');
      }
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: result.status,
        providerPaymentId: result.providerPaymentId ?? undefined,
        failureReason: result.failureReason,
        providerPayload: result.raw as Prisma.InputJsonValue,
        paidAt: result.status === PaymentStatus.PAID ? new Date() : null,
      },
    });

    if (result.status === PaymentStatus.PAID) {
      // With One Click Checkout the delivery address was collected inside
      // Cashfree, not by our form, so it is only knowable now. Saved before
      // the order is confirmed, so fulfilment never sees a paid order with a
      // blank address.
      await this.captureCollectedAddress(orderId, payment.providerOrderId);

      const { OrderService } = await import('./order.service');
      await OrderService.markPaid(orderId, 'gateway-verify');
      return { status: result.status, settled: true };
    }
    if (result.status === PaymentStatus.FAILED) {
      const { OrderService } = await import('./order.service');
      await OrderService.markPaymentFailed(orderId, result.failureReason ?? 'Payment failed at gateway.');
    }

    return { status: result.status, settled: false };
  },

  /**
   * Applies an inbound payment webhook.
   *
   * Every event is recorded first (by an idempotency key when the provider
   * gives one) so replays are no-ops and unsigned events stay auditable.
   *
   * Two settlement paths, depending on whether the provider signs its
   * webhooks:
   *
   *   • Signed (`signatureOk: true`) — the payload itself carries the order
   *     and status, applied directly.
   *   • Unsigned, e.g. Fastrr's `Order` webhook (published with no signature
   *     header at all, and explicitly documented as "may be sent more than
   *     once") — the payload is used only to find *which* order to check, and
   *     `verifyAndSettle` re-fetches the authoritative status from the
   *     provider's signed REST endpoint before anything changes.
   */
  async handleWebhook(rawBody: string, headers: Headers): Promise<{ handled: boolean; reason?: string }> {
    const gateway = paymentProvider();
    const parsed = await gateway.parseWebhook(rawBody, headers);

    const event = await prisma.webhookEvent.upsert({
      where: { externalId: parsed.externalId ?? `payment_${Date.now()}_${Math.random()}` },
      create: {
        provider: gateway.name,
        eventType: parsed.eventType,
        externalId: parsed.externalId,
        payload: parsed.raw as Prisma.InputJsonValue,
        signatureOk: parsed.signatureOk,
      },
      update: {},
      select: { id: true, processedAt: true },
    });

    if (event.processedAt) return { handled: false, reason: 'already processed' };

    if (parsed.signatureOk) {
      return this.applySignedWebhook(event.id, parsed);
    }
    return this.triggerReverification(event.id, parsed);
  },

  /** Signed-webhook path: the payload is trusted directly. */
  async applySignedWebhook(eventId: string, parsed: WebhookResult): Promise<{ handled: boolean; reason?: string }> {
    if (!parsed.orderNumber || !parsed.status) {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date(), error: 'Event carried no actionable order/status.' },
      });
      return { handled: false, reason: 'no actionable payload' };
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber: parsed.orderNumber },
      include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!order) {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date(), error: `Unknown order ${parsed.orderNumber}` },
      });
      return { handled: false, reason: 'unknown order' };
    }

    const payment = order.payments[0];
    if (payment) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: parsed.status,
          providerPaymentId: parsed.providerPaymentId ?? undefined,
          providerPayload: parsed.raw as Prisma.InputJsonValue,
          paidAt: parsed.status === PaymentStatus.PAID ? new Date() : payment.paidAt,
        },
      });
    }

    const { OrderService } = await import('./order.service');
    if (parsed.status === PaymentStatus.PAID) await OrderService.markPaid(order.id, 'payment-webhook');
    else if (parsed.status === PaymentStatus.FAILED) await OrderService.markPaymentFailed(order.id, 'Payment failed at gateway.');

    await prisma.webhookEvent.update({ where: { id: eventId }, data: { processedAt: new Date() } });
    return { handled: true };
  },

  /**
   * Unsigned-webhook path (Fastrr). The payload only identifies which
   * provider order to check; `verifyAndSettle` does the actual settling
   * against the signed REST endpoint.
   */
  async triggerReverification(eventId: string, parsed: WebhookResult): Promise<{ handled: boolean; reason?: string }> {
    if (!parsed.providerOrderId) {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date(), error: 'Unsigned event carried no provider order id to verify.' },
      });
      return { handled: false, reason: 'no provider order id' };
    }

    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: parsed.providerOrderId },
      select: { orderId: true },
    });
    if (!payment) {
      await prisma.webhookEvent.update({
        where: { id: eventId },
        data: { processedAt: new Date(), error: `No payment found for provider order ${parsed.providerOrderId}` },
      });
      return { handled: false, reason: 'unknown provider order' };
    }

    await this.verifyAndSettle(payment.orderId).catch((err) => {
      // A verify failure here must not throw back into the webhook response —
      // the provider would retry indefinitely. It is recorded and left for
      // the next webhook delivery or a manual admin check instead.
      console.error('[payments] re-verification from webhook failed', err);
    });

    await prisma.webhookEvent.update({ where: { id: eventId }, data: { processedAt: new Date() } });
    return { handled: true };
  },

  /**
   * Saves the delivery address One Click Checkout collected inside Cashfree.
   *
   * For an OCC order our own checkout never asked for an address, so this is
   * the only place it becomes known. Written to `addressSnapshot`, which is
   * what the confirmation page, admin and fulfilment all read.
   *
   * Deliberately never throws: an order whose payment has genuinely settled
   * must not be left unconfirmed because an address lookup failed. A failure
   * is logged and the order proceeds — the address is still recoverable from
   * the Cashfree dashboard.
   */
  async captureCollectedAddress(orderId: string, providerOrderId: string | null): Promise<void> {
    if (!providerOrderId) return;

    const gateway = paymentProvider();
    if (!(gateway instanceof CashfreeProvider)) return;

    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { addressSnapshot: true },
      });

      // Never overwrite an address the customer gave us directly — a signed-in
      // customer's saved address is more authoritative than a network lookup.
      // Contact details are still refreshed below, since a guest order opens
      // with placeholders either way.
      const existing = order?.addressSnapshot as { pincode?: string } | null;
      const keepExistingAddress = Boolean(existing?.pincode);

      const collected = await gateway.fetchCollectedDetails(providerOrderId);
      if (!collected) return;

      await prisma.order.update({
        where: { id: orderId },
        data: {
          ...(collected.address && !keepExistingAddress
            ? { addressSnapshot: collected.address as unknown as Prisma.InputJsonValue }
            : {}),
          // A guest's real contact details only exist once Cashfree has them.
          // Written over the placeholders the express route opened with, so
          // order tracking and delivery updates reach the actual customer.
          ...(collected.customerEmail ? { email: collected.customerEmail } : {}),
          ...(collected.customerPhone ? { phone: collected.customerPhone } : {}),
        },
      });
    } catch (err) {
      console.error('[payments] capturing OCC address failed', { orderId }, err);
    }
  },

  /**
   * Refunds through the gateway and records the result against the payment.
   * Fastrr's current API has no refund endpoint — `refundPayment` throws a
   * clear `PAYMENT_ERROR` in that case, which surfaces in the admin UI rather
   * than pretending to succeed.
   */
  async refund(orderId: string, amountPaise: number, reason?: string) {
    const payment = await prisma.payment.findFirst({
      where: { orderId, status: { in: [PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED] } },
      orderBy: { createdAt: 'desc' },
    });
    if (!payment) throw notFound('No settled payment to refund for this order.');

    const alreadyRefunded = toPaise(payment.refundedAmount);
    const paid = toPaise(payment.amount);
    if (alreadyRefunded + amountPaise > paid) {
      throw new AppError('BAD_REQUEST', 'Refund amount exceeds the amount paid.');
    }

    const result = await paymentProvider().refundPayment(
      { providerOrderId: payment.providerOrderId, providerPaymentId: payment.providerPaymentId },
      amountPaise,
      reason,
    );

    const totalRefunded = alreadyRefunded + result.refundedPaise;
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: toDecimal(totalRefunded),
        providerRefundId: result.providerRefundId,
        status: totalRefunded >= paid ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
        refundedAt: new Date(),
        providerPayload: result.raw as Prisma.InputJsonValue,
      },
    });

    return result;
  },
};
