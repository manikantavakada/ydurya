'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Price } from '@/components/ui/price';
import { Skeleton } from '@/components/ui/skeleton';
import { useCartActions } from '@/hooks/use-cart';
import { rupees } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import type { ProductCardDTO, ProductDetailDTO } from '@/types';

/**
 * Size picker used by "Quick add" on the grid.
 *
 * Variants are fetched on open rather than embedded in every card — stock
 * changes and the listing payload stays small.
 */
export function QuickAddSheet({
  product,
  open,
  onOpenChange,
}: {
  product: ProductCardDTO;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);
  const { addItem } = useCartActions();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['product', product.slug],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product.slug}`);
      if (!res.ok) throw new Error('Could not load sizes.');
      return (await res.json()) as ProductDetailDTO;
    },
    enabled: open,
  });

  const variants = data?.variants ?? [];
  const chosen = variants.find((v) => v.id === selected) ?? null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        title={product.name}
        description="Choose a size"
        className="lg:inset-y-0 lg:right-0 lg:left-auto lg:max-h-none lg:w-full lg:max-w-sm lg:rounded-none"
        footer={
          <div className="space-y-2">
            <Button
              size="xl"
              full
              disabled={!chosen || !chosen.inStock}
              loading={addItem.isPending}
              onClick={() => {
                if (!chosen) return;
                addItem.mutate(
                  {
                    variantId: chosen.id,
                    quantity: 1,
                    meta: {
                      id: product.id,
                      name: product.name,
                      price: rupees(chosen.pricePaise),
                      variant: chosen.size?.label,
                    },
                  },
                  { onSuccess: () => onOpenChange(false) },
                );
              }}
            >
              {chosen ? 'Add to bag' : 'Select a size'}
            </Button>
            <Button asChild variant="ghost" size="sm" full>
              <Link href={`/product/${product.slug}`}>View full details</Link>
            </Button>
          </div>
        }
      >
        <div className="flex gap-4">
          <div className="relative h-28 w-21 shrink-0 overflow-hidden rounded-md bg-surface" style={{ width: 84 }}>
            {product.image && !product.image.isPlaceholder && (
              <Image src={product.image.url} alt="" fill sizes="84px" className="object-cover" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-sans text-sm text-ink">{product.name}</p>
            <Price
              pricePaise={chosen?.pricePaise ?? product.pricePaise}
              compareAtPaise={chosen?.compareAtPaise ?? product.compareAtPaise}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="eyebrow mb-2.5">Size</p>

          {isLoading && (
            <div className="flex gap-2">
              {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-12 w-14" />)}
            </div>
          )}

          {isError && <p className="text-sm text-danger">Sizes could not be loaded. Please open the product page.</p>}

          {!isLoading && !isError && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Size">
              {variants.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="radio"
                  aria-checked={selected === v.id}
                  disabled={!v.inStock}
                  onClick={() => setSelected(v.id)}
                  className={cn(
                    'relative h-12 min-w-14 rounded-md border px-3 text-sm transition-colors',
                    selected === v.id ? 'border-ink bg-ink text-bg' : 'border-ink/20 text-ink hover:border-ink',
                    !v.inStock && 'cursor-not-allowed border-line text-faint hover:border-line',
                  )}
                >
                  {v.size?.label ?? 'One size'}
                  {!v.inStock && (
                    <span
                      className="pointer-events-none absolute inset-0 m-auto h-px w-[130%] -rotate-[24deg] bg-ink/20"
                      aria-hidden
                    />
                  )}
                  {!v.inStock && <span className="sr-only"> — sold out</span>}
                </button>
              ))}
            </div>
          )}

          {chosen?.isLowStock && chosen.inStock && (
            <p className="mt-3 text-xs text-gold-ink">Only {chosen.available} left in this size.</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
