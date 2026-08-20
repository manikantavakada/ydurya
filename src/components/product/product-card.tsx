'use client';

import Image from 'next/image';
import Link from 'next/link';
import * as React from 'react';
import { Heart, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Price } from '@/components/ui/price';
import { QuickAddSheet } from './quick-add-sheet';
import type { ProductCardDTO } from '@/types';

/**
 * The storefront's core tile.
 *
 * • Image swap on hover (desktop) mirrors the live theme's `image-swap` tag.
 * • Quick add opens a size sheet rather than guessing a variant — a shirt with
 *   four sizes has no sensible default.
 * • The whole card is one link with an overlay, so the tap target is the full
 *   tile on mobile while the wishlist/quick-add controls stay separately
 *   focusable for keyboard users.
 */
export function ProductCard({
  product,
  priority = false,
  isWishlisted = false,
  onToggleWishlist,
  className,
  sizes = '(min-width:1280px) 22vw, (min-width:768px) 30vw, 45vw',
}: {
  product: ProductCardDTO;
  priority?: boolean;
  isWishlisted?: boolean;
  onToggleWishlist?: (product: ProductCardDTO) => void;
  className?: string;
  sizes?: string;
}) {
  const [quickAddOpen, setQuickAddOpen] = React.useState(false);
  const href = `/product/${product.slug}`;
  const hasHover = Boolean(product.hoverImage && !product.hoverImage.isPlaceholder);

  return (
    <article className={cn('group relative flex flex-col', className)}>
      <div className="relative overflow-hidden rounded-lg bg-surface">
        <Link href={href} className="block" tabIndex={-1} aria-hidden>
          <div className="relative aspect-[3/4]">
            {product.image && !product.image.isPlaceholder ? (
              <>
                <Image
                  src={product.image.url}
                  alt={product.image.alt}
                  fill
                  sizes={sizes}
                  priority={priority}
                  loading={priority ? undefined : 'lazy'}
                  placeholder={product.image.blurDataUrl ? 'blur' : 'empty'}
                  blurDataURL={product.image.blurDataUrl ?? undefined}
                  className={cn(
                    'object-cover transition-[opacity,transform] duration-500 ease-out',
                    hasHover ? 'group-hover:opacity-0' : 'group-hover:scale-[1.03]',
                  )}
                />
                {hasHover && (
                  <Image
                    src={product.hoverImage!.url}
                    alt=""
                    fill
                    sizes={sizes}
                    loading="lazy"
                    aria-hidden
                    className="object-cover opacity-0 transition-opacity duration-500 ease-out group-hover:opacity-100"
                  />
                )}
              </>
            ) : (
              // Honest placeholder — the admin still needs to upload artwork.
              <div className="grid h-full place-items-center bg-sunken">
                <span className="px-4 text-center font-display text-xs uppercase tracking-luxe text-faint">
                  Image coming soon
                </span>
              </div>
            )}
          </div>
        </Link>

        {/* Badges */}
        <div className="pointer-events-none absolute left-2.5 top-2.5 flex flex-col items-start gap-1.5">
          {product.discountPercent != null && product.discountPercent > 0 && (
            <span className="rounded-sm bg-ink px-1.5 py-1 text-2xs font-semibold uppercase tracking-wide2 text-bg">
              {product.discountPercent}% off
            </span>
          )}
          {product.isBestSeller && (
            <span className="rounded-sm bg-gold px-1.5 py-1 text-2xs font-semibold uppercase tracking-wide2 text-white">
              Best seller
            </span>
          )}
          {!product.isBestSeller && product.isNewArrival && (
            <span className="rounded-sm bg-bg/90 px-1.5 py-1 text-2xs font-semibold uppercase tracking-wide2 text-ink">
              New
            </span>
          )}
        </div>

        {!product.inStock && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center bg-bg/65">
            <span className="rounded-sm bg-ink/85 px-3 py-1.5 text-2xs font-semibold uppercase tracking-luxe text-bg">
              Sold out
            </span>
          </div>
        )}

        {onToggleWishlist && (
          <button
            type="button"
            onClick={() => onToggleWishlist(product)}
            aria-pressed={isWishlisted}
            aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
            className={cn(
              'absolute right-2.5 top-2.5 z-10 grid h-9 w-9 place-items-center rounded-full',
              'bg-bg/85 text-ink backdrop-blur transition-colors hover:bg-bg',
            )}
          >
            <Heart className={cn('h-[18px] w-[18px]', isWishlisted && 'fill-danger text-danger')} aria-hidden />
          </button>
        )}

        {/* Quick add. Always reachable on touch; slides up on desktop hover. */}
        {product.inStock && (
          <div
            className={cn(
              'absolute inset-x-2.5 bottom-2.5 z-10',
              'lg:translate-y-[130%] lg:opacity-0 lg:transition-[transform,opacity] lg:duration-300',
              'lg:group-hover:translate-y-0 lg:group-hover:opacity-100 lg:group-focus-within:translate-y-0 lg:group-focus-within:opacity-100',
            )}
          >
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className={cn(
                'flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-bg/95 backdrop-blur',
                'text-2xs font-semibold uppercase tracking-wide2 text-ink shadow-card',
                'transition-colors hover:bg-ink hover:text-bg',
              )}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Quick add
              <span className="sr-only"> — {product.name}</span>
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <h3 className="text-sm leading-snug">
          <Link href={href} className="line-clamp-2-safe font-sans text-ink after:absolute after:inset-0 after:content-['']">
            {product.name}
          </Link>
        </h3>

        <Price pricePaise={product.pricePaise} compareAtPaise={product.compareAtPaise} size="sm" />

        {product.colors.length > 0 && (
          <ul className="mt-0.5 flex items-center gap-1.5" aria-label="Available colours">
            {product.colors.slice(0, 5).map((c) => (
              <li
                key={c.id}
                title={c.name}
                className="h-3 w-3 rounded-full ring-1 ring-inset ring-ink/15"
                style={{ backgroundColor: c.hex }}
              >
                <span className="sr-only">{c.name}</span>
              </li>
            ))}
          </ul>
        )}

        {product.sizes.length > 0 && (
          <p className="mt-0.5 text-2xs uppercase tracking-wide2 text-faint">
            {product.sizes.map((s) => s.label).join(' · ')}
          </p>
        )}
      </div>

      {quickAddOpen && (
        <QuickAddSheet product={product} open={quickAddOpen} onOpenChange={setQuickAddOpen} />
      )}
    </article>
  );
}
