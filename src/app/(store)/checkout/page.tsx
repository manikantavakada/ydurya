import type { Metadata } from 'next';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { getCurrentUser } from '@/lib/auth/session';
import { CustomerService } from '@/services/customer.service';
import { PaymentService } from '@/services/payment.service';
import { getSettings } from '@/lib/settings';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  const [addresses, settings] = await Promise.all([
    user ? CustomerService.listAddresses(user.id) : Promise.resolve([]),
    getSettings(),
  ]);

  return (
    <CheckoutForm
      isSignedIn={Boolean(user)}
      defaultEmail={user?.email}
      savedAddresses={addresses.map((a) => ({
        id: a.id,
        fullName: a.fullName,
        phone: a.phone,
        line1: a.line1,
        line2: a.line2,
        landmark: a.landmark,
        city: a.city,
        state: a.state,
        pincode: a.pincode,
        country: a.country,
        isDefault: a.isDefault,
      }))}
      codEnabled={settings['shipping.cod_enabled'] as boolean}
      codFeePaise={settings['shipping.cod_fee_paise'] as number}
      prepaidAvailable={PaymentService.isPrepaidAvailable()}
      gatewayCollectsAddress={PaymentService.collectsAddress()}
    />
  );
}
