'use client';

import { ProductCard } from './product-card';
import { useWishlist } from '@/hooks/use-wishlist';
import { rupees } from '@/lib/analytics';
import { cn } from '@/lib/utils';
import type { ProductCardDTO } from '@/types';

/**
 * Responsive grid: 2-up on phones (the density a shopping app uses),
 * 3-up from tablet, 4-up on large desktop.
 */
export function ProductGrid({
  products,
  isSignedIn = false,
  priorityCount = 4,
  className,
}: {
  products: ProductCardDTO[];
  isSignedIn?: boolean;
  priorityCount?: number;
  className?: string;
}) {
  const wishlist = useWishlist({ isSignedIn });

  return (
    <div className={cn('grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-5 md:gap-y-10 xl:grid-cols-4', className)}>
      {products.map((product, i) => (
        <ProductCard
          key={product.id}
          product={product}
          priority={i < priorityCount}
          isWishlisted={wishlist.has(product.id)}
          onToggleWishlist={(p) =>
            wishlist.toggle.mutate({
              productId: p.id,
              meta: { id: p.id, name: p.name, price: rupees(p.pricePaise) },
            })
          }
        />
      ))}
    </div>
  );
}
