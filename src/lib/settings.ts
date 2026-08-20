import 'server-only';
import { cache } from 'react';
import { prisma } from './prisma';

/**
 * Commerce rules. Defaults are the values currently live on ydurya.com,
 * read out of the storefront theme — not guesses:
 *
 *   SHIP_FEE = 9900 paise            → ₹99 flat shipping
 *   YD_FREE_SHIP_THRESHOLD = 99900   → free over ₹999
 *   "Handling ₹7 × items"            → ₹7 per unit
 *   "Prepaid: no extra | COD: +₹27"  → ₹27 COD surcharge
 *
 * Admin edits override these in the Setting table.
 */
export const SETTING_DEFAULTS = {
  'shipping.fee_paise': 9900,
  'shipping.free_threshold_paise': 99900,
  'shipping.free_enabled': true,
  'shipping.cod_enabled': true,
  'shipping.cod_fee_paise': 2700,
  'handling.per_item_paise': 700,
  'tax.enabled': false,
  'tax.rate_percent': 0,
  'orders.number_prefix': 'YD',
  'store.currency': 'INR',
  'store.email': '',
  'store.phone': '',
  'store.pickup_pincode': '530001',
  'inventory.low_stock_threshold': 3,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;
export type SettingValue = (typeof SETTING_DEFAULTS)[SettingKey];

function parse(raw: string, sample: unknown): unknown {
  if (typeof sample === 'number') {
    const n = Number(raw);
    return Number.isFinite(n) ? n : sample;
  }
  if (typeof sample === 'boolean') return raw === 'true' || raw === '1';
  return raw;
}

/**
 * Loads all settings once per request. Falls back to defaults if the table is
 * unreachable, so a settings outage degrades to live-site behaviour rather
 * than breaking checkout.
 */
export const getSettings = cache(async (): Promise<Record<SettingKey, SettingValue>> => {
  const resolved = { ...SETTING_DEFAULTS } as Record<string, unknown>;
  try {
    const rows = await prisma.setting.findMany();
    for (const row of rows) {
      if (row.key in SETTING_DEFAULTS) {
        resolved[row.key] = parse(row.value, SETTING_DEFAULTS[row.key as SettingKey]);
      }
    }
  } catch (err) {
    console.error('[settings] falling back to defaults', err);
  }
  return resolved as Record<SettingKey, SettingValue>;
});

export async function getSetting<K extends SettingKey>(key: K): Promise<(typeof SETTING_DEFAULTS)[K]> {
  const all = await getSettings();
  return all[key] as (typeof SETTING_DEFAULTS)[K];
}

export async function setSetting(key: SettingKey, value: string | number | boolean): Promise<void> {
  const sample = SETTING_DEFAULTS[key];
  const type = typeof sample === 'number' ? 'number' : typeof sample === 'boolean' ? 'boolean' : 'string';
  const group = key.split('.')[0];
  await prisma.setting.upsert({
    where: { key },
    create: { key, value: String(value), type, group },
    update: { value: String(value), type, group },
  });
}
