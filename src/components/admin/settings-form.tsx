'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input, Field } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';

export interface SettingsValues {
  shippingFee: number;
  freeThreshold: number;
  freeEnabled: boolean;
  codEnabled: boolean;
  codFee: number;
  handlingPerItem: number;
  taxEnabled: boolean;
  taxRate: number;
  orderPrefix: string;
  pickupPincode: string;
  lowStockThreshold: number;
}

/**
 * Store settings.
 *
 * Rupee amounts are entered here and converted to integer paise before being
 * stored — the pricing engine only ever deals in paise.
 */
export function SettingsForm({ initial }: { initial: SettingsValues }) {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<SettingsValues>({ defaultValues: initial });

  return (
    <form
      onSubmit={form.handleSubmit(async (values) => {
        const res = await fetch('/api/admin/settings', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            'shipping.fee_paise': Math.round(values.shippingFee * 100),
            'shipping.free_threshold_paise': Math.round(values.freeThreshold * 100),
            'shipping.free_enabled': values.freeEnabled,
            'shipping.cod_enabled': values.codEnabled,
            'shipping.cod_fee_paise': Math.round(values.codFee * 100),
            'handling.per_item_paise': Math.round(values.handlingPerItem * 100),
            'tax.enabled': values.taxEnabled,
            'tax.rate_percent': values.taxRate,
            'orders.number_prefix': values.orderPrefix,
            'store.pickup_pincode': values.pickupPincode,
            'inventory.low_stock_threshold': values.lowStockThreshold,
          }),
        });
        const json = await res.json().catch(() => ({}));
        toast(
          res.ok
            ? { title: 'Settings saved', variant: 'success' }
            : { title: json?.error?.message ?? 'Could not save settings.', variant: 'error' },
        );
        if (res.ok) router.refresh();
      })}
      className="space-y-5"
    >
      <section className="space-y-4 rounded-lg border border-line p-5">
        <h2 className="font-serif text-lg">Shipping</h2>

        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-ink" {...form.register('freeEnabled')} />
          Offer free shipping above a threshold
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Flat shipping fee (₹)" htmlFor="s-fee">
            <Input type="number" step="1" min="0" {...form.register('shippingFee', { valueAsNumber: true })} />
          </Field>
          <Field label="Free shipping above (₹)" htmlFor="s-threshold">
            <Input type="number" step="1" min="0" {...form.register('freeThreshold', { valueAsNumber: true })} />
          </Field>
        </div>

        <Field label="Handling fee per item (₹)" htmlFor="s-handling" hint="Charged once per unit in the bag.">
          <Input type="number" step="1" min="0" {...form.register('handlingPerItem', { valueAsNumber: true })} />
        </Field>
      </section>

      <section className="space-y-4 rounded-lg border border-line p-5">
        <h2 className="font-serif text-lg">Cash on delivery</h2>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-ink" {...form.register('codEnabled')} />
          Accept cash on delivery
        </label>
        <Field label="COD surcharge (₹)" htmlFor="s-cod">
          <Input type="number" step="1" min="0" {...form.register('codFee', { valueAsNumber: true })} />
        </Field>
      </section>

      <section className="space-y-4 rounded-lg border border-line p-5">
        <h2 className="font-serif text-lg">Tax</h2>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-ink" {...form.register('taxEnabled')} />
          Add tax at checkout
        </label>
        <Field
          label="Tax rate (%)"
          htmlFor="s-tax"
          hint="Product prices on the live store are inclusive of tax, so this is off by default."
        >
          <Input type="number" step="0.01" min="0" max="100" {...form.register('taxRate', { valueAsNumber: true })} />
        </Field>
      </section>

      <section className="space-y-4 rounded-lg border border-line p-5">
        <h2 className="font-serif text-lg">Store</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Order number prefix" htmlFor="s-prefix" hint="e.g. YD → YD-2026-0001">
            <Input maxLength={6} {...form.register('orderPrefix')} />
          </Field>
          <Field label="Dispatch PIN code" htmlFor="s-pincode">
            <Input inputMode="numeric" maxLength={6} {...form.register('pickupPincode')} />
          </Field>
        </div>
        <Field label="Default low-stock threshold" htmlFor="s-low">
          <Input type="number" min="0" {...form.register('lowStockThreshold', { valueAsNumber: true })} />
        </Field>
      </section>

      <Button type="submit" size="lg" loading={form.formState.isSubmitting}>
        Save settings
      </Button>
    </form>
  );
}
