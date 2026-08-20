'use client';

import * as React from 'react';
import Image from 'next/image';
import { ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ProductImageDTO } from '@/types';

/**
 * Product gallery.
 *
 * Mobile: a native snap-scroll strip with dot indicators — the swipe gesture
 * is the browser's own, so it is as smooth as a native app and costs no JS.
 * Desktop: thumbnail rail plus hover-to-zoom on the main image.
 */
export function ProductGallery({ images, productName }: { images: ProductImageDTO[]; productName: string }) {
  const [active, setActive] = React.useState(0);
  const [zooming, setZooming] = React.useState(false);
  const [origin, setOrigin] = React.useState({ x: 50, y: 50 });
  const stripRef = React.useRef<HTMLDivElement>(null);

  const usable = images.filter((i) => !i.isPlaceholder);

  if (usable.length === 0) {
    return (
      <div className="grid aspect-[3/4] place-items-center rounded-lg bg-sunken">
        <p className="px-6 text-center font-display text-xs uppercase tracking-luxe text-faint">
          Image coming soon
        </p>
      </div>
    );
  }

  // Track which image is centred as the customer swipes.
  const onStripScroll = () => {
    const el = stripRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  const scrollToIndex = (index: number) => {
    stripRef.current?.scrollTo({ left: index * stripRef.current.clientWidth, behavior: 'smooth' });
    setActive(index);
  };

  return (
    <div className="lg:flex lg:gap-4">
      {/* Desktop thumbnails */}
      {usable.length > 1 && (
        <div className="hidden shrink-0 lg:block">
          <ul className="flex w-20 flex-col gap-2.5" role="tablist" aria-label="Product images">
            {usable.map((image, i) => (
              <li key={image.id}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={active === i}
                  aria-label={`View image ${i + 1} of ${usable.length}`}
                  onClick={() => setActive(i)}
                  onMouseEnter={() => setActive(i)}
                  className={cn(
                    'relative block aspect-[3/4] w-full overflow-hidden rounded-md bg-surface ring-1 transition-[box-shadow]',
                    active === i ? 'ring-2 ring-ink' : 'ring-line hover:ring-ink/40',
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="80px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Mobile: swipeable strip */}
      <div className="lg:hidden">
        <div
          ref={stripRef}
          onScroll={onStripScroll}
          className="rail -mx-4 gap-0 px-0 sm:-mx-6"
          aria-label={`${productName} images`}
        >
          {usable.map((image, i) => (
            <div key={image.id} className="relative aspect-[3/4] w-screen shrink-0 snap-center bg-surface sm:w-[calc(100vw)]">
              <Image
                src={image.url}
                alt={i === 0 ? productName : `${productName} — view ${i + 1}`}
                fill
                sizes="100vw"
                priority={i === 0}
                placeholder={image.blurDataUrl ? 'blur' : 'empty'}
                blurDataURL={image.blurDataUrl ?? undefined}
                className="object-cover"
              />
            </div>
          ))}
        </div>

        {usable.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5" role="tablist" aria-label="Choose image">
            {usable.map((image, i) => (
              <button
                key={image.id}
                type="button"
                role="tab"
                aria-selected={active === i}
                aria-label={`Image ${i + 1}`}
                onClick={() => scrollToIndex(i)}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  active === i ? 'w-5 bg-ink' : 'w-1.5 bg-ink/20',
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: main image with hover zoom */}
      <div className="hidden min-w-0 flex-1 lg:block">
        <div
          className="group relative aspect-[3/4] w-full cursor-zoom-in overflow-hidden rounded-lg bg-surface"
          onMouseEnter={() => setZooming(true)}
          onMouseLeave={() => setZooming(false)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setOrigin({
              x: ((e.clientX - rect.left) / rect.width) * 100,
              y: ((e.clientY - rect.top) / rect.height) * 100,
            });
          }}
        >
          <Image
            src={usable[active].url}
            alt={active === 0 ? productName : `${productName} — view ${active + 1}`}
            fill
            sizes="(min-width:1024px) 50vw, 100vw"
            priority
            placeholder={usable[active].blurDataUrl ? 'blur' : 'empty'}
            blurDataURL={usable[active].blurDataUrl ?? undefined}
            className="object-cover transition-transform duration-200 ease-out"
            style={{
              transform: zooming ? 'scale(2)' : 'scale(1)',
              transformOrigin: `${origin.x}% ${origin.y}%`,
            }}
          />
          <span
            className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-bg/85 px-2.5 py-1.5 text-2xs uppercase tracking-wide2 text-muted opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
            aria-hidden
          >
            <ZoomIn className="h-3 w-3" /> Hover to zoom
          </span>
        </div>
      </div>
    </div>
  );
}
