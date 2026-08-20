import { cn } from '@/lib/utils';
import { formatPaise } from '@/lib/money';

/**
 * Sale styling follows the live store: current price in ink, the struck-through
 * compare-at price muted beside it, and a gold "NN% OFF" badge.
 */
export function Price({
  pricePaise,
  compareAtPaise,
  size = 'md',
  showDiscount = true,
  className,
}: {
  pricePaise: number;
  compareAtPaise?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showDiscount?: boolean;
  className?: string;
}) {
  const onSale = Boolean(compareAtPaise && compareAtPaise > pricePaise);
  const percent = onSale ? Math.round(((compareAtPaise! - pricePaise) / compareAtPaise!) * 100) : null;

  const sizes = {
    sm: { now: 'text-sm font-medium', was: 'text-xs', off: 'text-2xs' },
    md: { now: 'text-base font-medium', was: 'text-sm', off: 'text-2xs' },
    lg: { now: 'text-2xl font-medium', was: 'text-base', off: 'text-xs' },
  }[size];

  return (
    <p className={cn('flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cn(sizes.now, 'text-ink')}>{formatPaise(pricePaise)}</span>

      {onSale && (
        <>
          <span className={cn(sizes.was, 'text-faint line-through')}>
            {formatPaise(compareAtPaise!)}
            <span className="sr-only"> original price</span>
          </span>
          {showDiscount && percent !== null && percent > 0 && (
            <span className={cn(sizes.off, 'font-sans font-semibold uppercase tracking-wide2 text-gold-ink')}>
              {percent}% off
            </span>
          )}
        </>
      )}
    </p>
  );
}
