import { NextResponse } from 'next/server';
import { withErrorHandling } from '@/lib/errors';
import { requirePermission } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

const HEADER = [
  'name', 'slug', 'subtitle', 'description', 'fabric', 'fit',
  'price', 'compare_at_price', 'status', 'categories',
  'featured', 'new_arrival', 'best_seller', 'images', 'variants',
];

const EXAMPLE = [
  'Charcoal Oxford Shirt', '', 'Everyday tailoring, relaxed', 'A crisp oxford weave that layers well.',
  'Cotton', 'Regular Fit', '999', '1499', 'draft', 'shirts,new-arrivals',
  'false', 'true', 'false', 'charcoal-1.jpg,charcoal-2.jpg', 'S:Black:10;M:Black:15;L:Black:8',
];

/** GET /api/admin/products/bulk-import/template — a starter CSV with one filled example row. */
export const GET = withErrorHandling(async () => {
  await requirePermission('products.read');

  const csv = [HEADER, EXAMPLE]
    .map((row) => row.map((cell) => (/[",\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(','))
    .join('\n');

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="ydurya-bulk-import-template.csv"',
    },
  });
});
