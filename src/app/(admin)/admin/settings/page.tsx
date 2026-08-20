import type { Metadata } from 'next';
import { requirePermission } from '@/lib/auth/session';
import { getSettings } from '@/lib/settings';
import { SettingsForm } from '@/components/admin/settings-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Settings' };

export default async function SettingsPage() {
  await requirePermission('settings.read');
  const settings = await getSettings();

  return (
    <div className="max-w-2xl space-y-6">
      <header>
        <h1 className="font-serif text-2xl">Settings</h1>
        <p className="mt-1 text-sm text-muted">
          Commerce rules used by the cart and checkout. Changes apply to new carts immediately.
        </p>
      </header>

      <SettingsForm
        initial={{
          shippingFee: (settings['shipping.fee_paise'] as number) / 100,
          freeThreshold: (settings['shipping.free_threshold_paise'] as number) / 100,
          freeEnabled: settings['shipping.free_enabled'] as boolean,
          codEnabled: settings['shipping.cod_enabled'] as boolean,
          codFee: (settings['shipping.cod_fee_paise'] as number) / 100,
          handlingPerItem: (settings['handling.per_item_paise'] as number) / 100,
          taxEnabled: settings['tax.enabled'] as boolean,
          taxRate: settings['tax.rate_percent'] as number,
          orderPrefix: settings['orders.number_prefix'] as string,
          pickupPincode: settings['store.pickup_pincode'] as string,
          lowStockThreshold: settings['inventory.low_stock_threshold'] as number,
        }}
      />
    </div>
  );
}
