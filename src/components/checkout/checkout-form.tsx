'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import { Banknote, CreditCard, Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field, Input, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { EmptyState } from '@/components/ui/states';
import { useCart } from '@/hooks/use-cart';
import { addressSchema, emailSchema, phoneSchema } from '@/lib/validation';
import { formatPaise } from '@/lib/money';
import { rupees, track } from '@/lib/analytics';
import { isCashfreeSdkConfigured, openCashfreeCheckout } from '@/lib/cashfree/sdk';
import { isFastrrSdkConfigured, openFastrrCheckout } from '@/lib/fastrr/sdk';
import { cn } from '@/lib/utils';
import type { OrderDTO } from '@/types';

const formSchema = z.object({
  email: emailSchema,
  phone: phoneSchema,
  address: addressSchema,
  saveAddress: z.boolean().default(false),
  paymentMethod: z.enum(['PREPAID', 'COD']),
  customerNote: z.string().max(1000).optional(),
});

/**
 * Used when Cashfree's One Click Checkout will collect the delivery address
 * during payment, so this form must not require one.
 */
const formSchemaNoAddress = formSchema.omit({ address: true });

type FormValues = z.input<typeof formSchema>;

export interface SavedAddress {
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  isDefault: boolean;
}

/**
 * Single-page, mobile-first checkout.
 *
 * The form collects details only. Every rupee is computed server-side: the
 * request carries no prices, and the order total shown here comes from the
 * cart endpoint's breakdown, which is produced by the same pricing engine the
 * order is created with.
 */
export function CheckoutForm({
  isSignedIn,
  savedAddresses,
  defaultEmail,
  codEnabled,
  codFeePaise,
  prepaidAvailable,
  gatewayCollectsAddress = false,
}: {
  isSignedIn: boolean;
  savedAddresses: SavedAddress[];
  defaultEmail?: string;
  codEnabled: boolean;
  codFeePaise: number;
  prepaidAvailable: boolean;
  /**
   * True when Cashfree's One Click Checkout will collect the delivery address
   * during payment, so this form does not need to ask for one.
   */
  gatewayCollectsAddress?: boolean;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: cart, isLoading } = useCart();

  const [submitting, setSubmitting] = React.useState(false);
  const [selectedAddressId, setSelectedAddressId] = React.useState<string | null>(
    savedAddresses.find((a) => a.isDefault)?.id ?? savedAddresses[0]?.id ?? null,
  );

  /**
   * Fast checkout for a returning customer.
   *
   * When a signed-in customer already has a saved address, there is nothing
   * left to type — email, phone and address are all known. Both fields
   * default to collapsed "review" cards so the page reads as one screen with
   * one button, not a form to fill in. "Change" reveals the editable fields
   * for exactly the customer who needs them: guests, and anyone adding a new
   * address. A brand-new destination always needs typing once — no gateway,
   * Cashfree included, can invent a shipping address that was never given.
   */
  const hasKnownAddress = isSignedIn && savedAddresses.length > 0;
  const [editingContact, setEditingContact] = React.useState(!hasKnownAddress);
  const [editingAddress, setEditingAddress] = React.useState(!hasKnownAddress);

  /**
   * One idempotency key per checkout attempt. Regenerated only after a
   * *failed* attempt, so a double-tap or a retried network request can never
   * create a second order.
   */
  const idempotencyKey = React.useRef<string>(crypto.randomUUID());

  const defaultAddress = savedAddresses.find((a) => a.id === selectedAddressId);

  /**
   * Whether this submission still needs an address from our own form.
   *
   * One Click Checkout collects it inside Cashfree, but only for prepaid —
   * a COD order has no payment step, so it must always be collected here.
   */
  const paymentMethodValue = prepaidAvailable ? 'PREPAID' : 'COD';
  const [addressCollectedByGateway, setAddressCollectedByGateway] = React.useState(
    gatewayCollectsAddress && paymentMethodValue === 'PREPAID' && !hasKnownAddress,
  );

  const form = useForm<FormValues>({
    resolver: zodResolver(addressCollectedByGateway ? formSchemaNoAddress : formSchema),
    defaultValues: {
      email: defaultEmail ?? '',
      phone: defaultAddress?.phone ?? '',
      paymentMethod: prepaidAvailable ? 'PREPAID' : 'COD',
      saveAddress: isSignedIn,
      address: {
        fullName: defaultAddress?.fullName ?? '',
        phone: defaultAddress?.phone ?? '',
        line1: defaultAddress?.line1 ?? '',
        line2: defaultAddress?.line2 ?? '',
        landmark: defaultAddress?.landmark ?? '',
        city: defaultAddress?.city ?? '',
        state: defaultAddress?.state ?? '',
        pincode: defaultAddress?.pincode ?? '',
        country: 'India',
      },
    },
  });

  const paymentMethod = form.watch('paymentMethod');

  /**
   * Cash on delivery has no payment step for Cashfree to collect an address
   * in, so switching to COD brings our own address form back.
   */
  React.useEffect(() => {
    setAddressCollectedByGateway(
      gatewayCollectsAddress && paymentMethod === 'PREPAID' && !hasKnownAddress,
    );
  }, [gatewayCollectsAddress, paymentMethod, hasKnownAddress]);

  // Fill the form when the customer picks a different saved address.
  // Not a hook — named `apply…` so it cannot be mistaken for one.
  const applySavedAddress = (address: SavedAddress) => {
    setSelectedAddressId(address.id);
    form.setValue('address.fullName', address.fullName);
    form.setValue('address.phone', address.phone);
    form.setValue('address.line1', address.line1);
    form.setValue('address.line2', address.line2 ?? '');
    form.setValue('address.landmark', address.landmark ?? '');
    form.setValue('address.city', address.city);
    form.setValue('address.state', address.state);
    form.setValue('address.pincode', address.pincode);
    form.setValue('phone', address.phone);
  };

  const onSubmit = async (values: FormValues) => {
    if (submitting) return;
    setSubmitting(true);

    try {
      track({
        name: 'add_payment_info',
        value: rupees(cart?.pricing.totalPaise ?? 0),
        paymentMethod: values.paymentMethod,
      });

      // Omit the address entirely when Cashfree will collect it — sending the
      // blank form values would fail validation rather than be ignored.
      const payload = addressCollectedByGateway
        ? { ...values, address: undefined, saveAddress: false }
        : values;

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, idempotencyKey: idempotencyKey.current }),
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        // A fresh key so a corrected retry is treated as a new attempt.
        idempotencyKey.current = crypto.randomUUID();
        throw new Error(json?.error?.message ?? 'We could not place your order.');
      }

      const order = json.order as OrderDTO;
      await queryClient.invalidateQueries({ queryKey: ['cart'] });

      if (values.paymentMethod === 'COD') {
        track({
          name: 'purchase',
          orderNumber: order.orderNumber,
          value: rupees(order.totalPaise),
          shipping: rupees(order.shippingPaise),
          tax: rupees(order.taxPaise),
          coupon: order.couponCode ?? undefined,
          items: order.items.map((i) => ({
            id: i.id, name: i.productName, price: rupees(i.unitPricePaise), quantity: i.quantity,
          })),
        });
        router.push(`/checkout/confirmation/${order.orderNumber}`);
        return;
      }

      // Prepaid. The order and its stock reservation already exist; what
      // follows is only a handoff. Nothing is marked paid here — settlement
      // only ever comes from a server-side verify, triggered either by the
      // redirect below or by the gateway's webhook.
      const payRes = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const payJson = await payRes.json().catch(() => ({}));
      const clientConfig = payJson.clientConfig as { paymentSessionId?: string; token?: string } | undefined;

      // 1. Cashfree's checkout modal, opened in-page with the session our
      // server just created (POST /orders).
      if (payRes.ok && clientConfig?.paymentSessionId && isCashfreeSdkConfigured()) {
        const result = await openCashfreeCheckout(clientConfig.paymentSessionId);
        // Cashfree takes over the page from here; on completion the customer
        // returns to /checkout/confirmation/[orderNumber], which re-verifies
        // server-side before showing anything as paid.
        if (result.opened) return;
        console.warn('[checkout] Cashfree widget unavailable, falling back:', result.reason);
      }

      // 2. Fastrr's checkout UI, opened in-page with its session token
      // (POST /api/v1/access-token/checkout) — kept as an alternative gateway.
      if (payRes.ok && clientConfig?.token && isFastrrSdkConfigured()) {
        const result = await openFastrrCheckout(clientConfig.token);
        if (result.opened) return;
        console.warn('[checkout] Fastrr widget unavailable, falling back:', result.reason);
      }

      // 3. A hosted redirect, if the gateway gave us one.
      if (payRes.ok && payJson.redirectUrl) {
        window.location.href = payJson.redirectUrl as string;
        return;
      }

      // 4. Nothing is available. The order exists and is awaiting payment;
      // the confirmation page says exactly that rather than implying success.
      router.push(`/checkout/confirmation/${order.orderNumber}`);
    } catch (err) {
      toast({
        title: err instanceof Error ? err.message : 'Something went wrong.',
        variant: 'error',
      });
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="container py-16 text-center text-sm text-muted">Loading your bag…</div>;
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="container py-10">
        <h1 className="text-3xl">Checkout</h1>
        <EmptyState
          title="Your bag is empty"
          message="Add something to your bag before checking out."
          actionLabel="Browse collection"
          actionHref="/shop"
        />
      </div>
    );
  }

  const p = cart.pricing;
  // Reflect the COD surcharge before the server confirms it.
  const projectedTotal = paymentMethod === 'COD' ? p.totalPaise + codFeePaise : p.totalPaise;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="container py-8 lg:py-12">
      <h1 className="mb-8 text-3xl">Checkout</h1>

      <div className="lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-12">
        <div className="space-y-8">
          {/* ── 1. Contact ────────────────────────────────────────────── */}
          <Step number={1} title="Contact details">
            {!editingContact ? (
              <ReviewRow
                lines={[form.getValues('email'), form.getValues('phone')]}
                onChange={() => setEditingContact(true)}
              />
            ) : (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Email" htmlFor="email" required error={form.formState.errors.email?.message}>
                    <Input type="email" autoComplete="email" placeholder="you@example.com" {...form.register('email')} />
                  </Field>
                  <Field label="Mobile number" htmlFor="phone" required error={form.formState.errors.phone?.message} hint="For delivery updates">
                    <Input type="tel" autoComplete="tel" inputMode="numeric" placeholder="10-digit number" {...form.register('phone')} />
                  </Field>
                </div>
                {!isSignedIn && (
                  <p className="mt-3 text-xs text-muted">
                    Have an account?{' '}
                    <Link href="/account/login?next=/checkout" className="text-ink underline underline-offset-4">Sign in</Link>{' '}
                    for faster checkout.
                  </p>
                )}
              </>
            )}
          </Step>

          {/* ── 2. Address ────────────────────────────────────────────── */}
          <Step number={2} title="Delivery address">
            {addressCollectedByGateway ? (
              /*
               * One Click Checkout. Asking for an address here would be asking
               * twice: Cashfree signs the customer in by phone number and
               * pre-fills the address from its saved-address network during
               * payment. We read it back afterwards via Get Order Extended.
               */
              <div className="rounded-md border border-line bg-surface/60 p-4">
                <p className="text-sm text-ink">Added during payment</p>
                <p className="mt-1 text-xs text-muted">
                  Sign in with your phone number at the next step and your saved delivery
                  address is filled in automatically.
                </p>
                <button
                  type="button"
                  onClick={() => setAddressCollectedByGateway(false)}
                  className="mt-3 text-2xs font-medium uppercase tracking-wide2 text-ink underline underline-offset-4 hover:text-muted"
                >
                  Enter address here instead
                </button>
              </div>
            ) : !editingAddress && defaultAddress ? (
              <ReviewRow
                lines={[
                  defaultAddress.fullName,
                  `${defaultAddress.line1}, ${defaultAddress.city}, ${defaultAddress.state} ${defaultAddress.pincode}`,
                ]}
                onChange={() => setEditingAddress(true)}
              />
            ) : (
              <>
                {savedAddresses.length > 0 && (
                  <ul className="mb-5 grid gap-2.5 sm:grid-cols-2">
                    {savedAddresses.map((address) => (
                      <li key={address.id}>
                        <button
                          type="button"
                          onClick={() => {
                            applySavedAddress(address);
                            // A saved card was just picked — nothing left to
                            // type, so collapse straight back to the fast path.
                            setEditingAddress(false);
                          }}
                          aria-pressed={selectedAddressId === address.id}
                          className={cn(
                            'w-full rounded-md border p-3 text-left text-sm transition-colors',
                            selectedAddressId === address.id ? 'border-ink bg-surface' : 'border-ink/15 hover:border-ink/40',
                          )}
                        >
                          <span className="block font-medium text-ink">{address.fullName}</span>
                          <span className="mt-0.5 block text-xs text-muted">
                            {address.line1}, {address.city}, {address.state} {address.pincode}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Full name" htmlFor="fullName" required error={form.formState.errors.address?.fullName?.message} className="sm:col-span-2">
                    <Input autoComplete="name" {...form.register('address.fullName')} />
                  </Field>
                  <Field label="Phone" htmlFor="addrPhone" required error={form.formState.errors.address?.phone?.message}>
                    <Input type="tel" inputMode="numeric" autoComplete="tel" {...form.register('address.phone')} />
                  </Field>
                  <Field label="PIN code" htmlFor="pincode" required error={form.formState.errors.address?.pincode?.message}>
                    <Input inputMode="numeric" maxLength={6} autoComplete="postal-code" {...form.register('address.pincode')} />
                  </Field>
                  <Field label="Address" htmlFor="line1" required error={form.formState.errors.address?.line1?.message} hint="House / flat, building, street" className="sm:col-span-2">
                    <Input autoComplete="address-line1" {...form.register('address.line1')} />
                  </Field>
                  <Field label="Area, colony (optional)" htmlFor="line2" className="sm:col-span-2">
                    <Input autoComplete="address-line2" {...form.register('address.line2')} />
                  </Field>
                  <Field label="Landmark (optional)" htmlFor="landmark" className="sm:col-span-2">
                    <Input {...form.register('address.landmark')} />
                  </Field>
                  <Field label="City" htmlFor="city" required error={form.formState.errors.address?.city?.message}>
                    <Input autoComplete="address-level2" {...form.register('address.city')} />
                  </Field>
                  <Field label="State" htmlFor="state" required error={form.formState.errors.address?.state?.message}>
                    <Input autoComplete="address-level1" {...form.register('address.state')} />
                  </Field>
                </div>

                {isSignedIn && (
                  <label className="mt-4 flex cursor-pointer items-center gap-2.5 text-sm text-muted">
                    <input type="checkbox" className="h-4 w-4 accent-ink" {...form.register('saveAddress')} />
                    Save this address to my account
                  </label>
                )}

                {hasKnownAddress && (
                  <Button type="button" variant="ghost" size="sm" className="mt-3" onClick={() => setEditingAddress(false)}>
                    Cancel
                  </Button>
                )}
              </>
            )}
          </Step>

          {/* ── 3. Payment ────────────────────────────────────────────── */}
          <Step number={3} title="Payment method">
            <div className="space-y-2.5" role="radiogroup" aria-label="Payment method">
              {prepaidAvailable && (
                <PaymentOption
                  value="PREPAID"
                  selected={paymentMethod === 'PREPAID'}
                  onSelect={() => form.setValue('paymentMethod', 'PREPAID')}
                  icon={<CreditCard className="h-5 w-5" aria-hidden />}
                  title="Pay online"
                  description="UPI, cards, net banking and wallets. No extra charge."
                  register={form.register('paymentMethod')}
                />
              )}
              {codEnabled && (
                <PaymentOption
                  value="COD"
                  selected={paymentMethod === 'COD'}
                  onSelect={() => form.setValue('paymentMethod', 'COD')}
                  icon={<Banknote className="h-5 w-5" aria-hidden />}
                  title="Cash on delivery"
                  description={`Pay when it arrives. ${formatPaise(codFeePaise)} handling charge applies.`}
                  register={form.register('paymentMethod')}
                />
              )}
            </div>

            {!prepaidAvailable && (
              <p className="mt-3 rounded-md bg-surface p-3 text-xs text-muted">
                Online payment is temporarily unavailable. You can still order with cash on delivery.
              </p>
            )}

            <div className="mt-5">
              <Field label="Order note (optional)" htmlFor="note">
                <Textarea rows={3} placeholder="Anything we should know about this delivery?" {...form.register('customerNote')} />
              </Field>
            </div>
          </Step>
        </div>

        {/* ── Summary ─────────────────────────────────────────────────── */}
        <aside className="mt-10 lg:sticky lg:top-[calc(var(--header-h)+2rem)] lg:mt-0">
          <div className="rounded-lg border border-line p-5">
            <h2 className="mb-4 font-serif text-lg">Your order</h2>

            <ul className="mb-4 max-h-64 space-y-3 overflow-y-auto">
              {cart.lines.map((line) => (
                <li key={line.id} className="flex gap-3">
                  <span className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-surface">
                    {line.image && <Image src={line.image} alt="" fill sizes="48px" className="object-cover" />}
                    <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-ink px-1 text-[10px] text-bg">
                      {line.quantity}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2-safe block text-xs text-ink">{line.name}</span>
                    <span className="block text-2xs text-muted">{line.variantLabel}</span>
                  </span>
                  <span className="text-xs tabular-nums">{formatPaise(line.lineTotalPaise)}</span>
                </li>
              ))}
            </ul>

            <dl className="space-y-2 border-t border-line pt-4 text-sm">
              <SummaryRow label="Subtotal" value={formatPaise(p.subtotalPaise)} />
              {p.discountPaise > 0 && (
                <SummaryRow label={`Discount${p.coupon ? ` (${p.coupon.code})` : ''}`} value={`− ${formatPaise(p.discountPaise)}`} tone="success" />
              )}
              <SummaryRow
                label="Shipping"
                value={p.shippingPaise === 0 ? 'FREE' : formatPaise(p.shippingPaise)}
                tone={p.shippingPaise === 0 ? 'success' : undefined}
              />
              {p.handlingPaise > 0 && <SummaryRow label="Handling" value={formatPaise(p.handlingPaise)} />}
              {paymentMethod === 'COD' && codFeePaise > 0 && (
                <SummaryRow label="COD charge" value={formatPaise(codFeePaise)} />
              )}
              {p.taxPaise > 0 && <SummaryRow label="Tax" value={formatPaise(p.taxPaise)} />}
            </dl>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="font-medium">Total</span>
              <span className="font-sans text-xl font-medium tabular-nums">{formatPaise(projectedTotal)}</span>
            </div>

            <Button type="submit" size="xl" full className="mt-5" loading={submitting}>
              <Lock className="h-4 w-4" aria-hidden />
              {paymentMethod === 'COD' ? 'Place order' : `Pay ${formatPaise(projectedTotal)}`}
            </Button>

            <p className="mt-3 flex items-start gap-1.5 text-2xs text-muted">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              Your total is confirmed on our server before payment. We never store card details.
            </p>
          </div>
        </aside>
      </div>
    </form>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${number}`}>
      <h2 id={`step-${number}`} className="mb-4 flex items-center gap-2.5 font-serif text-lg">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-xs text-bg" aria-hidden>
          {number}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/**
 * A known value shown as read-only text with a "Change" link, instead of an
 * editable field. This is what makes returning-customer checkout read as one
 * screen with one button rather than a form: nothing here can be typed into
 * until the customer explicitly asks to.
 */
function ReviewRow({ lines, onChange }: { lines: string[]; onChange: () => void }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-line bg-surface/60 p-3.5">
      <div className="min-w-0 text-sm">
        {lines.filter(Boolean).map((line, i) => (
          <p key={i} className={i === 0 ? 'font-medium text-ink' : 'mt-0.5 text-muted'}>
            {line}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={onChange}
        className="shrink-0 text-2xs font-medium uppercase tracking-wide2 text-ink underline underline-offset-4 hover:text-muted"
      >
        Change
      </button>
    </div>
  );
}

function PaymentOption({
  value, selected, onSelect, icon, title, description, register,
}: {
  value: string;
  selected: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  register: ReturnType<ReturnType<typeof useForm<FormValues>>['register']>;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-md border p-4 transition-colors',
        selected ? 'border-ink bg-surface' : 'border-ink/15 hover:border-ink/40',
      )}
    >
      <input type="radio" value={value} className="sr-only" {...register} onChange={onSelect} checked={selected} />
      <span className={cn('mt-0.5 shrink-0', selected ? 'text-ink' : 'text-muted')}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-ink">{title}</span>
        <span className="mt-0.5 block text-xs text-muted">{description}</span>
      </span>
      <span
        className={cn(
          'mt-1 grid h-4 w-4 shrink-0 place-items-center rounded-full border',
          selected ? 'border-ink' : 'border-ink/25',
        )}
        aria-hidden
      >
        {selected && <span className="h-2 w-2 rounded-full bg-ink" />}
      </span>
    </label>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="text-muted">{label}</dt>
      <dd className={cn('tabular-nums', tone === 'success' ? 'font-medium text-success' : 'text-ink')}>{value}</dd>
    </div>
  );
}
