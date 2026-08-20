'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Home, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';

/**
 * Persistent bottom tab bar — the single biggest thing that makes the phone
 * experience read as an app rather than a shrunken website. Hidden from
 * `lg` up, where the header carries the same destinations.
 */
export function BottomNav({ isSignedIn }: { isSignedIn: boolean }) {
  const pathname = usePathname();
  const { data: cart } = useCart();
  const itemCount = cart?.itemCount ?? 0;

  const tabs = [
    { href: '/', label: 'Home', Icon: Home, match: (p: string) => p === '/' },
    { href: '/shop', label: 'Shop', Icon: Search, match: (p: string) => p.startsWith('/shop') || p.startsWith('/category') || p.startsWith('/search') },
    { href: '/wishlist', label: 'Saved', Icon: Heart, match: (p: string) => p.startsWith('/wishlist') },
    { href: '/cart', label: 'Bag', Icon: ShoppingBag, match: (p: string) => p.startsWith('/cart'), badge: itemCount },
    { href: isSignedIn ? '/account' : '/account/login', label: 'Account', Icon: User, match: (p: string) => p.startsWith('/account') },
  ];

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-bg/95 backdrop-blur-md lg:hidden"
      aria-label="Main"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ href, label, Icon, match, badge }) => {
          const active = match(pathname);
          return (
            <li key={label}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex h-[var(--bottom-nav-h)] flex-col items-center justify-center gap-0.5 transition-colors',
                  active ? 'text-ink' : 'text-muted',
                )}
              >
                <span className="relative">
                  <Icon className={cn('h-[22px] w-[22px]', active && 'stroke-[2.2]')} aria-hidden />
                  {badge ? (
                    <span
                      className="absolute -right-2 -top-1.5 grid min-w-[16px] place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-4 text-white"
                      aria-hidden
                    >
                      {badge > 9 ? '9+' : badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
                {badge ? <span className="sr-only">{badge} items in bag</span> : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
