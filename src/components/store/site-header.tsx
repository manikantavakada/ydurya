'use client';

import * as React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Menu, Search, ShoppingBag, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BRAND } from '@/lib/brand';
import { useCart } from '@/hooks/use-cart';
import { CartDrawer } from './cart-drawer';
import { SearchDialog } from './search-dialog';
import { MobileMenu } from './mobile-menu';
import { MegaMenu } from './mega-menu';
import type { CategoryDTO } from '@/types';

export interface HeaderNavItem {
  label: string;
  href: string;
  children?: CategoryDTO[];
}

/**
 * Sticky header, in two modes.
 *
 * On the homepage it starts fully transparent so the campaign photography runs
 * edge to edge behind it, with light type. The moment the page scrolls it
 * picks up a blurred background and switches to ink type — which is what keeps
 * it readable over unpredictable photographs rather than hoping every image is
 * dark enough.
 *
 * Everywhere else it is the standard opaque header.
 *
 * Mobile is a compact app bar; the remaining destinations live in the bottom
 * tab bar and the drawer.
 */
export function SiteHeader({
  navItems,
  isSignedIn,
  wishlistCount = 0,
  overlayTheme = 'LIGHT',
}: {
  navItems: HeaderNavItem[];
  isSignedIn: boolean;
  wishlistCount?: number;
  /** Contrast to use while transparent, taken from the leading homepage band. */
  overlayTheme?: 'LIGHT' | 'DARK';
}) {
  const pathname = usePathname();
  const isHome = pathname === '/';

  const [scrolled, setScrolled] = React.useState(false);
  const [cartOpen, setCartOpen] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);

  const { data: cart } = useCart();
  const itemCount = cart?.itemCount ?? 0;

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Transparent only at the very top of the homepage.
  const overlay = isHome && !scrolled;
  // DARK means dark type — the artwork behind it is bright.
  const onLightArt = overlayTheme === 'DARK';

  return (
    <>
      <header
        data-overlay={overlay || undefined}
        className={cn(
          'sticky top-0 z-40 transition-[background-color,border-color,box-shadow,color] duration-300',
          overlay
            ? onLightArt
              ? 'border-b border-ink/10 bg-transparent text-ink'
              : 'border-b border-white/10 bg-transparent text-white'
            : 'border-b bg-bg/90 text-ink backdrop-blur-md',
          !overlay && scrolled ? 'border-line shadow-[0_1px_0_rgb(26_26_26/0.04)]' : '',
          !overlay && !scrolled ? 'border-transparent' : '',
        )}
      >
        <div className="container flex h-[var(--header-h)] items-center justify-between gap-3">
          {/* ── Mobile: menu ─────────────────────────────────────────── */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            className={cn(
              '-ml-2 grid h-11 w-11 place-items-center rounded-full transition-colors lg:hidden',
              overlay ? (onLightArt ? 'hover:bg-ink/5' : 'hover:bg-white/10') : 'hover:bg-surface',
            )}
          >
            <Menu className="h-[22px] w-[22px]" aria-hidden />
          </button>

          {/* The full wordmark below already covers "home" as a link and
              fades in only once scrolled, since the campaign artwork carries
              its own wordmark at the top of the homepage. This mark stays
              visible throughout so the brand is never entirely absent from
              the bar next to the menu button. */}
          <Link href="/" aria-hidden tabIndex={-1} className="lg:hidden">
            <Image src="/images/brand/logo-y.webp" alt="" width={300} height={292} className="h-7 w-auto" />
          </Link>

          {/* ── Desktop: primary nav ─────────────────────────────────── */}
          <nav className="hidden min-w-0 flex-1 lg:block" aria-label="Primary">
            <ul className="flex items-center gap-1">
              {navItems.map((item) =>
                item.children?.length ? (
                  <MegaMenu
                    key={`${item.label}-${item.href}`}
                    item={item}
                    active={pathname.startsWith(item.href)}
                    overlay={overlay}
                    overlayOnLightArt={onLightArt}
                  />
                ) : (
                  <li key={`${item.label}-${item.href}`}>
                    <Link
                      href={item.href}
                      className={cn(
                        'inline-flex h-9 items-center rounded-md px-3 text-2xs font-medium uppercase tracking-wide2 transition-colors',
                        overlay
                          ? onLightArt
                            ? 'text-ink/70 hover:text-ink'
                            : 'text-white/80 hover:text-white'
                          : pathname === item.href
                            ? 'text-ink'
                            : 'text-muted hover:text-ink',
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </nav>

          {/* ── Logo ─────────────────────────────────────────────────── */}
          <Link
            href="/"
            aria-label={`${BRAND.name} home`}
            className={cn(
              'font-display font-bold tracking-luxe transition-all duration-300 lg:absolute lg:left-1/2 lg:-translate-x-1/2',
              scrolled ? 'text-lg lg:text-xl' : 'text-lg lg:text-2xl',
              // YDURYA's campaign artwork already carries the wordmark, so the
              // header's copy would sit directly beneath a second one. It fades
              // out only while transparent over that artwork and returns the
              // moment the page scrolls — the link stays reachable throughout.
              overlay && 'pointer-events-none opacity-0',
            )}
          >
            {BRAND.name}
          </Link>

          {/* ── Actions ──────────────────────────────────────────────── */}
          <div className="flex flex-1 items-center justify-end gap-0.5 lg:flex-none">
            <HeaderAction label="Search products" overlay={overlay} onLightArt={onLightArt} onClick={() => setSearchOpen(true)}>
              <Search className="h-[21px] w-[21px]" aria-hidden />
            </HeaderAction>

            <HeaderAction
              label={wishlistCount ? `Wishlist, ${wishlistCount} saved` : 'Wishlist'}
              overlay={overlay}
              onLightArt={onLightArt}
              href="/wishlist"
              className="hidden sm:grid"
              badge={wishlistCount}
            >
              <Heart className="h-[21px] w-[21px]" aria-hidden />
            </HeaderAction>

            <HeaderAction
              label={isSignedIn ? 'Your account' : 'Sign in'}
              overlay={overlay}
              onLightArt={onLightArt}
              href={isSignedIn ? '/account' : '/account/login'}
              className="hidden lg:grid"
            >
              <User className="h-[21px] w-[21px]" aria-hidden />
            </HeaderAction>

            <HeaderAction
              label={itemCount ? `Bag, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Bag, empty'}
              overlay={overlay}
              onLightArt={onLightArt}
              onClick={() => setCartOpen(true)}
              className="-mr-2"
              badge={itemCount}
            >
              <ShoppingBag className="h-[21px] w-[21px]" aria-hidden />
            </HeaderAction>
          </div>
        </div>
      </header>

      <CartDrawer open={cartOpen} onOpenChange={setCartOpen} />
      <SearchDialog open={searchOpen} onOpenChange={setSearchOpen} />
      <MobileMenu open={menuOpen} onOpenChange={setMenuOpen} navItems={navItems} isSignedIn={isSignedIn} />
    </>
  );
}

/** One header control — link or button — with consistent hit area and badge. */
function HeaderAction({
  label, overlay, onLightArt = false, href, onClick, children, className, badge,
}: {
  label: string;
  overlay: boolean;
  onLightArt?: boolean;
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  badge?: number;
}) {
  const classes = cn(
    'relative grid h-11 w-11 place-items-center rounded-full transition-colors',
    overlay ? (onLightArt ? 'hover:bg-ink/5' : 'hover:bg-white/10') : 'hover:bg-surface',
    className,
  );

  const content = (
    <>
      {children}
      {badge ? (
        <span
          className="absolute right-1 top-1.5 grid min-w-[17px] place-items-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-[17px] text-white"
          aria-hidden
        >
          {badge > 9 ? '9+' : badge}
        </span>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} aria-label={label} className={classes}>
        {content}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} aria-label={label} className={classes}>
      {content}
    </button>
  );
}
